import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("guest leaderboard access", () => {
  it("allows anonymous gameplay but refuses a leaderboard submission until a NEON ID exists", async () => {
    const caller = appRouter.createCaller(createGuestContext());
    await expect(caller.leaderboard.submit({ score: 400, gameVariant: "original" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "請建立或登入 NEON ID 後再加入排行榜",
    });
  });
});
