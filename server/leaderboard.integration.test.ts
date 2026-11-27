import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { leaderboardEntries } from "../drizzle/schema";
import { getDb, submitAnonymousScore } from "./db";

const deviceId = crypto.randomUUID();
const deviceLabel = `Legacy Device · ${deviceId.slice(-4).toUpperCase()}`;

afterAll(async () => {
  const db = await getDb();
  await db?.delete(leaderboardEntries).where(eq(leaderboardEntries.deviceId, deviceId));
});

describe("legacy anonymous score retention", () => {
  it("keeps the best local device score available for a later NEON ID migration", async () => {
    const first = await submitAnonymousScore({ deviceId, deviceLabel, score: 400 });
    expect(first).toMatchObject({ bestScore: 400, improved: true });

    const lower = await submitAnonymousScore({ deviceId, deviceLabel, score: 250 });
    expect(lower).toMatchObject({ bestScore: 400, improved: false });

    const db = await getDb();
    const saved = await db?.select().from(leaderboardEntries).where(eq(leaderboardEntries.deviceId, deviceId)).limit(1);
    expect(saved?.[0]).toMatchObject({ deviceId, bestScore: 400, neonPlayerId: null });
  }, 20_000);
});
