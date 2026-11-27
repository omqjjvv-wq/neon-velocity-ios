import { afterAll, describe, expect, it } from "vitest";
import { inArray, or, eq } from "drizzle-orm";
import { leaderboardEntries, neonPlayers } from "../drizzle/schema";
import {
  createNeonPlayer,
  getDb,
  getNeonLeaderboard,
  migrateAnonymousEntryToNeonPlayer,
  submitAnonymousScore,
  submitNeonScore,
} from "./db";
import { hashGameCode } from "./neonIdentity";

const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const primaryHandle = `TEST PILOT ${suffix}`;
const rivalHandle = `TEST RIVAL ${suffix}`;
const legacyDeviceId = crypto.randomUUID();

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const players = await db.select().from(neonPlayers).where(inArray(neonPlayers.handleKey, [primaryHandle, rivalHandle]));
  const playerIds = players.map((player) => player.id);
  if (playerIds.length) {
    await db.delete(leaderboardEntries).where(or(inArray(leaderboardEntries.neonPlayerId, playerIds), eq(leaderboardEntries.deviceId, legacyDeviceId)));
  } else {
    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.deviceId, legacyDeviceId));
  }
  await db.delete(neonPlayers).where(inArray(neonPlayers.handleKey, [primaryHandle, rivalHandle]));
});

describe("NEON ID leaderboard integration", () => {
  it("keeps one cross-browser personal best and moves the current legacy device best into it", async () => {
    const player = await createNeonPlayer({
      displayName: "Test Pilot",
      handleKey: primaryHandle,
      gameCodeHash: hashGameCode("240618"),
    });
    const rival = await createNeonPlayer({
      displayName: "Test Rival",
      handleKey: rivalHandle,
      gameCodeHash: hashGameCode("240619"),
    });

    await submitAnonymousScore({ deviceId: legacyDeviceId, deviceLabel: "Legacy Browser", score: 640 });
    const migration = await migrateAnonymousEntryToNeonPlayer({ playerId: player.id, displayName: player.displayName, deviceId: legacyDeviceId });
    expect(migration).toEqual({ migrated: true, bestScore: 640 });

    const lower = await submitNeonScore({ playerId: player.id, displayName: player.displayName, score: 500 });
    expect(lower).toMatchObject({ bestScore: 640, improved: false });
    const higher = await submitNeonScore({ playerId: player.id, displayName: player.displayName, score: 980 });
    expect(higher).toMatchObject({ bestScore: 980, improved: true });

    await submitNeonScore({ playerId: rival.id, displayName: rival.displayName, score: 1000 });
    await submitNeonScore({ playerId: player.id, displayName: player.displayName, score: 700, gameVariant: "error-dimension" });
    await submitNeonScore({ playerId: rival.id, displayName: rival.displayName, score: 800, gameVariant: "error-dimension" });
    const board = await getNeonLeaderboard(player.id, "original");
    expect(board.personal).toMatchObject({ playerId: player.id, displayName: "Test Pilot", bestScore: 980 });
    expect(board.personal?.rank).toBeGreaterThanOrEqual(1);
    expect(board.entries.some((entry) => entry.playerId === player.id && entry.displayName === "Test Pilot")).toBe(true);

    const errorBoard = await getNeonLeaderboard(player.id, "error-dimension");
    expect(errorBoard.personal).toMatchObject({ playerId: player.id, displayName: "Test Pilot", bestScore: 700 });
    expect(errorBoard.entries.some((entry) => entry.playerId === player.id && entry.bestScore === 700)).toBe(true);
    expect(errorBoard.entries.some((entry) => entry.playerId === player.id && entry.bestScore === 980)).toBe(false);
  }, 20_000);
});
