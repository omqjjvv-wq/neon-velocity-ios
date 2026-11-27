import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gameCanvas = readFileSync(new URL("./components/GameCanvas.tsx", import.meta.url), "utf8");

describe("NEON ID Traditional Chinese interface", () => {
  it("uses the shared three-language resource while keeping NEON ID as the product name", () => {
    expect(gameCanvas).toContain("getLocaleText(language)");
    expect(gameCanvas).toContain("LANGUAGE_OPTIONS.map");
    expect(gameCanvas).toContain("<span>NEON ID</span>");
    expect(gameCanvas).not.toContain("CREATE & JOIN RANK");
  });

  it("routes leaderboard reads, submissions and NEON ID migration through the active game variant", () => {
    expect(gameCanvas).toContain("trpc.leaderboard.list.useQuery({ gameVariant: variant }");
    expect(gameCanvas).toContain("submitScore.mutate({ score, gameVariant: variant })");
    expect(gameCanvas).toContain("const payload = { displayName, gameCode, gameVariant: variant }");
    expect(gameCanvas).toContain("if (!player) {");
    expect(gameCanvas).toContain("openIdentity(\"login\")");
  });
});
