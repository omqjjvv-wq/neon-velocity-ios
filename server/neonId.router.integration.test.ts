import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { leaderboardEntries, neonPlayers } from "../drizzle/schema";
import { getDb } from "./db";
import { NEON_SESSION_COOKIE, readNeonSession } from "./neonIdentity";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };
const displayName = `Router Pilot ${crypto.randomUUID().slice(0, 8)}`;

function createContext(cookie = "") {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: cookie ? { cookie } : {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const player = await db.select().from(neonPlayers).where(eq(neonPlayers.displayName, displayName)).limit(1);
  if (player[0]) {
    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.neonPlayerId, player[0].id));
    await db.delete(neonPlayers).where(eq(neonPlayers.id, player[0].id));
  }
});

describe("NEON ID router flow", () => {
  it("opens the same leaderboard identity from a second browser session", async () => {
    const first = createContext();
    const registered = await appRouter.createCaller(first.ctx).neonId.register({ displayName, gameCode: "240618" });
    const firstCookie = first.cookies.find((cookie) => cookie.name === NEON_SESSION_COOKIE);
    expect(firstCookie).toBeDefined();

    const second = createContext();
    const reopened = await appRouter.createCaller(second.ctx).neonId.login({ displayName, gameCode: "240618", gameVariant: "error-dimension" });
    expect(reopened.player).toEqual(registered.player);
    const secondCookie = second.cookies.find((cookie) => cookie.name === NEON_SESSION_COOKIE);
    expect(secondCookie).toBeDefined();

    const session = await readNeonSession({ headers: { cookie: `${NEON_SESSION_COOKIE}=${secondCookie!.value}` } } as never);
    expect(session).toMatchObject({ playerId: registered.player.playerId, displayName });

    const returningBrowser = createContext(`${NEON_SESSION_COOKIE}=${secondCookie!.value}`);
    const originalResult = await appRouter.createCaller(returningBrowser.ctx).leaderboard.submit({ score: 720, gameVariant: "original" });
    expect(originalResult).toMatchObject({ bestScore: 720, improved: true });
    const errorResult = await appRouter.createCaller(returningBrowser.ctx).leaderboard.submit({ score: 880, gameVariant: "error-dimension" });
    expect(errorResult).toMatchObject({ bestScore: 880, improved: true });
  }, 20_000);
});
