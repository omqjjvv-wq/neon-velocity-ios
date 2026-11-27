import { COOKIE_NAME } from "@shared/const";
import type { GameVariant } from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createNeonPlayer,
  getNeonLeaderboard,
  getNeonPlayerByHandleKey,
  getNeonPlayerById,
  migrateAnonymousEntryToNeonPlayer,
  submitNeonScore,
  touchNeonPlayer,
} from "./db";
import { readAnonymousDevice } from "./anonymousIdentity";
import {
  createNeonHandleKey,
  hashGameCode,
  issueNeonSession,
  NEON_SESSION_COOKIE,
  normalizeNeonName,
  readNeonSession,
  verifyGameCode,
} from "./neonIdentity";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const recentSubmissions = new Map<string, number>();
const GAME_VARIANTS = ["original", "error-dimension"] as const;
const failedLogins = new Map<string, { count: number; startedAt: number }>();
const GAME_CODE = /^\d{6}$/;

function playerPayload(player: { id: number; displayName: string }) {
  return { playerId: player.id, displayName: player.displayName };
}

function setNeonSessionCookie(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: Function } }, token: string) {
  ctx.res.cookie(NEON_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: 180 * 24 * 60 * 60 * 1000,
  });
}

async function requireNeonPlayer(ctx: Parameters<typeof readNeonSession>[0]) {
  const session = await readNeonSession(ctx);
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "請建立或登入 NEON ID 後再加入排行榜" });
  const player = await getNeonPlayerById(session.playerId);
  if (!player) throw new TRPCError({ code: "UNAUTHORIZED", message: "此 NEON ID 登入狀態已失效，請重新登入" });
  return player;
}

function ensureLoginAllowed(handleKey: string) {
  const now = Date.now();
  const state = failedLogins.get(handleKey);
  if (!state || now - state.startedAt > 10 * 60 * 1000) return;
  if (state.count >= 8) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "請稍候幾分鐘後，再嘗試此 NEON ID" });
}

function recordFailedLogin(handleKey: string) {
  const now = Date.now();
  const previous = failedLogins.get(handleKey);
  if (!previous || now - previous.startedAt > 10 * 60 * 1000) {
    failedLogins.set(handleKey, { count: 1, startedAt: now });
  } else {
    failedLogins.set(handleKey, { ...previous, count: previous.count + 1 });
  }
}

async function migrateCurrentDevice(player: { id: number; displayName: string }, req: Parameters<typeof readAnonymousDevice>[0], gameVariant: GameVariant) {
  const device = await readAnonymousDevice(req);
  if (!device) return { migrated: false, bestScore: null };
  return migrateAnonymousEntryToNeonPlayer({ playerId: player.id, displayName: player.displayName, deviceId: device.deviceId, gameVariant });
}

const neonCredentials = z.object({
  displayName: z.string().trim().min(2).max(24),
  gameCode: z.string().regex(GAME_CODE, "Game code must have exactly six digits"),
  gameVariant: z.enum(GAME_VARIANTS).default("original"),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  neonId: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const session = await readNeonSession(ctx.req);
      if (!session) return null;
      const player = await getNeonPlayerById(session.playerId);
      return player ? playerPayload(player) : null;
    }),
    register: publicProcedure.input(neonCredentials).mutation(async ({ ctx, input }) => {
      const displayName = normalizeNeonName(input.displayName);
      const handleKey = createNeonHandleKey(displayName);
      try {
        const existing = await getNeonPlayerByHandleKey(handleKey);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "此 NEON ID 已被使用，請換一個名稱" });
        const player = await createNeonPlayer({ displayName, handleKey, gameCodeHash: hashGameCode(input.gameCode) });
        const token = await issueNeonSession(playerPayload(player));
        setNeonSessionCookie(ctx, token);
        const migration = await migrateCurrentDevice(player, ctx.req, input.gameVariant);
        return { player: playerPayload(player), migration };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[NEON ID] Registration failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "目前無法建立 NEON ID，請稍後再試" });
      }
    }),
    login: publicProcedure.input(neonCredentials).mutation(async ({ ctx, input }) => {
      const displayName = normalizeNeonName(input.displayName);
      const handleKey = createNeonHandleKey(displayName);
      ensureLoginAllowed(handleKey);
      try {
        const player = await getNeonPlayerByHandleKey(handleKey);
        if (!player || !verifyGameCode(input.gameCode, player.gameCodeHash)) {
          recordFailedLogin(handleKey);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "NEON ID 或六位遊戲碼不正確" });
        }
        failedLogins.delete(handleKey);
        await touchNeonPlayer(player.id);
        const token = await issueNeonSession(playerPayload(player));
        setNeonSessionCookie(ctx, token);
        const migration = await migrateCurrentDevice(player, ctx.req, input.gameVariant);
        return { player: playerPayload(player), migration };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[NEON ID] Login failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "目前無法開啟 NEON ID，請稍後再試" });
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(NEON_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  leaderboard: router({
    list: publicProcedure.input(z.object({ gameVariant: z.enum(GAME_VARIANTS) })).query(async ({ ctx, input }) => {
      try {
        const session = await readNeonSession(ctx.req);
        return await getNeonLeaderboard(session?.playerId, input.gameVariant);
      } catch (error) {
        console.error("[Leaderboard] List failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "排行榜暫時無法使用，請稍後再試" });
      }
    }),
    submit: publicProcedure
      .input(z.object({ score: z.number().int().min(0).max(1_000_000), gameVariant: z.enum(GAME_VARIANTS) }))
      .mutation(async ({ ctx, input }) => {
        try {
          const player = await requireNeonPlayer(ctx.req);
          const lastSubmissionKey = `${player.id}:${input.gameVariant}`;
          const lastSubmission = recentSubmissions.get(lastSubmissionKey) ?? 0;
          if (Date.now() - lastSubmission < 2_500) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "請稍候再提交下一筆成績" });
          }
          recentSubmissions.set(lastSubmissionKey, Date.now());
          return await submitNeonScore({ playerId: player.id, displayName: player.displayName, score: input.score, gameVariant: input.gameVariant });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Leaderboard] Submit failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "成績目前無法提交，請稍後再試" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
