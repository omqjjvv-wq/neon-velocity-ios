import { and, count, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, leaderboardEntries, neonPlayers, users } from "../drizzle/schema";

export type GameVariant = "original" | "error-dimension";
const DEFAULT_GAME_VARIANT: GameVariant = "original";
import { ENV } from "./_core/env";
import { calculateRank, shouldReplaceBestScore } from "./leaderboardRules";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

export async function getNeonPlayerByHandleKey(handleKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(neonPlayers).where(eq(neonPlayers.handleKey, handleKey)).limit(1);
  return result[0] ?? null;
}

export async function getNeonPlayerById(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(neonPlayers).where(eq(neonPlayers.id, playerId)).limit(1);
  return result[0] ?? null;
}

export async function createNeonPlayer(input: { displayName: string; handleKey: string; gameCodeHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(neonPlayers).values(input);
  const playerId = Number(inserted[0].insertId);
  const player = await getNeonPlayerById(playerId);
  if (!player) throw new Error("NEON ID was not created");
  return player;
}

export async function touchNeonPlayer(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(neonPlayers).set({ lastSignedIn: new Date() }).where(eq(neonPlayers.id, playerId));
}

/** Retained solely so an existing device cookie can migrate its previous best score. */
export async function submitAnonymousScore(input: { deviceId: string; deviceLabel: string; score: number; gameVariant?: GameVariant }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const gameVariant = input.gameVariant ?? DEFAULT_GAME_VARIANT;
  const existing = await db.select().from(leaderboardEntries).where(and(eq(leaderboardEntries.deviceId, input.deviceId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
  const current = existing[0] ?? null;
  const improved = shouldReplaceBestScore(current?.bestScore ?? null, input.score);
  if (!current) {
    await db.insert(leaderboardEntries).values({ deviceId: input.deviceId, deviceLabel: input.deviceLabel, gameVariant, bestScore: input.score });
  } else if (improved) {
    await db.update(leaderboardEntries).set({ bestScore: input.score, deviceLabel: input.deviceLabel }).where(eq(leaderboardEntries.id, current.id));
  }
  const latest = await db.select().from(leaderboardEntries).where(and(eq(leaderboardEntries.deviceId, input.deviceId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
  const entry = latest[0];
  if (!entry) throw new Error("Leaderboard entry was not saved");
  const above = await db.select({ total: count() }).from(leaderboardEntries).where(and(eq(leaderboardEntries.gameVariant, gameVariant), isNotNull(leaderboardEntries.neonPlayerId), gt(leaderboardEntries.bestScore, entry.bestScore)));
  return { bestScore: entry.bestScore, improved, rank: calculateRank(Number(above[0]?.total ?? 0)) };
}

/** Move only the current browser's old anonymous best into the authenticated NEON ID. */
export async function migrateAnonymousEntryToNeonPlayer(input: { playerId: number; displayName: string; deviceId: string; gameVariant?: GameVariant }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const gameVariant = input.gameVariant ?? DEFAULT_GAME_VARIANT;
  return db.transaction(async (tx) => {
    const legacyRows = await tx.select().from(leaderboardEntries)
      .where(and(eq(leaderboardEntries.deviceId, input.deviceId), eq(leaderboardEntries.gameVariant, gameVariant), isNull(leaderboardEntries.neonPlayerId))).limit(1);
    const legacy = legacyRows[0];
    if (!legacy) return { migrated: false, bestScore: null };

    const accountRows = await tx.select().from(leaderboardEntries)
      .where(and(eq(leaderboardEntries.neonPlayerId, input.playerId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
    const accountEntry = accountRows[0];
    if (!accountEntry) {
      await tx.update(leaderboardEntries)
        .set({ neonPlayerId: input.playerId, deviceLabel: input.displayName })
        .where(eq(leaderboardEntries.id, legacy.id));
      return { migrated: true, bestScore: legacy.bestScore };
    }

    const bestScore = Math.max(accountEntry.bestScore, legacy.bestScore);
    if (bestScore !== accountEntry.bestScore || accountEntry.deviceLabel !== input.displayName) {
      await tx.update(leaderboardEntries).set({ bestScore, deviceLabel: input.displayName }).where(eq(leaderboardEntries.id, accountEntry.id));
    }
    await tx.delete(leaderboardEntries).where(eq(leaderboardEntries.id, legacy.id));
    return { migrated: true, bestScore };
  });
}

export async function submitNeonScore(input: { playerId: number; displayName: string; score: number; gameVariant?: GameVariant }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const gameVariant = input.gameVariant ?? DEFAULT_GAME_VARIANT;
  const existingRows = await db.select().from(leaderboardEntries).where(and(eq(leaderboardEntries.neonPlayerId, input.playerId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
  const current = existingRows[0] ?? null;
  const improved = shouldReplaceBestScore(current?.bestScore ?? null, input.score);
  if (!current) {
    await db.insert(leaderboardEntries).values({
      deviceId: `neon-${input.playerId}-${gameVariant}`,
      deviceLabel: input.displayName,
      neonPlayerId: input.playerId,
      gameVariant,
      bestScore: input.score,
    });
  } else if (improved || current.deviceLabel !== input.displayName) {
    await db.update(leaderboardEntries)
      .set({ bestScore: improved ? input.score : current.bestScore, deviceLabel: input.displayName })
      .where(eq(leaderboardEntries.id, current.id));
  }
  const latestRows = await db.select().from(leaderboardEntries).where(and(eq(leaderboardEntries.neonPlayerId, input.playerId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
  const entry = latestRows[0];
  if (!entry) throw new Error("Leaderboard entry was not saved");
  const above = await db.select({ total: count() }).from(leaderboardEntries)
    .where(and(eq(leaderboardEntries.gameVariant, gameVariant), isNotNull(leaderboardEntries.neonPlayerId), gt(leaderboardEntries.bestScore, entry.bestScore)));
  return { bestScore: entry.bestScore, improved, rank: calculateRank(Number(above[0]?.total ?? 0)) };
}

export async function getNeonLeaderboard(playerId?: number, gameVariant: GameVariant = DEFAULT_GAME_VARIANT) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(leaderboardEntries)
    .where(and(eq(leaderboardEntries.gameVariant, gameVariant), isNotNull(leaderboardEntries.neonPlayerId)))
    .orderBy(desc(leaderboardEntries.bestScore), desc(leaderboardEntries.updatedAt)).limit(10);
  const entries = rows.map((entry) => ({
    id: entry.id,
    playerId: entry.neonPlayerId!,
    displayName: entry.deviceLabel,
    bestScore: entry.bestScore,
  }));

  let personal: { playerId: number; displayName: string; bestScore: number; rank: number } | null = null;
  if (playerId) {
    const personalRows = await db.select().from(leaderboardEntries).where(and(eq(leaderboardEntries.neonPlayerId, playerId), eq(leaderboardEntries.gameVariant, gameVariant))).limit(1);
    const entry = personalRows[0];
    if (entry) {
      const above = await db.select({ total: count() }).from(leaderboardEntries)
        .where(and(eq(leaderboardEntries.gameVariant, gameVariant), isNotNull(leaderboardEntries.neonPlayerId), gt(leaderboardEntries.bestScore, entry.bestScore)));
      personal = { playerId, displayName: entry.deviceLabel, bestScore: entry.bestScore, rank: calculateRank(Number(above[0]?.total ?? 0)) };
    }
  }
  return { entries, personal };
}
