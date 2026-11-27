import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the optional Manus OAuth flow that ships with the template.
 * The game leaderboard uses the separate NEON ID model below.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * A lightweight game-only identity. The six digit game code is stored only as a
 * salted scrypt hash; players use it to open their own record on another browser.
 */
export const neonPlayers = mysqlTable("neonPlayers", {
  id: int("id").autoincrement().primaryKey(),
  displayName: varchar("displayName", { length: 32 }).notNull(),
  handleKey: varchar("handleKey", { length: 64 }).notNull(),
  gameCodeHash: varchar("gameCodeHash", { length: 192 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [uniqueIndex("neon_players_handle_key_unique").on(table.handleKey)]);

export type NeonPlayer = typeof neonPlayers.$inferSelect;

/**
 * Legacy device rows remain claimable by their cookie owner, but only rows bound
 * to a NEON ID are visible in the public leaderboard after this migration.
 */
export const leaderboardEntries = mysqlTable("leaderboardEntries", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  deviceLabel: varchar("deviceLabel", { length: 96 }).notNull(),
  neonPlayerId: int("neonPlayerId"),
  gameVariant: mysqlEnum("gameVariant", ["original", "error-dimension"]).default("original").notNull(),
  bestScore: int("bestScore").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("leaderboard_score_idx").on(table.gameVariant, table.bestScore),
  uniqueIndex("leaderboard_device_variant_unique").on(table.deviceId, table.gameVariant),
  uniqueIndex("leaderboard_neon_player_variant_unique").on(table.neonPlayerId, table.gameVariant),
]);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardEntries.$inferInsert;
