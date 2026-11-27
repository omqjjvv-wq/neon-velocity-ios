import { describe, expect, it } from "vitest";
import { calculateRank, shouldReplaceBestScore } from "./leaderboardRules";

describe("anonymous leaderboard score rules", () => {
  it("keeps the highest score for a device", () => {
    expect(shouldReplaceBestScore(null, 210)).toBe(true);
    expect(shouldReplaceBestScore(210, 209)).toBe(false);
    expect(shouldReplaceBestScore(210, 210)).toBe(false);
    expect(shouldReplaceBestScore(210, 211)).toBe(true);
  });

  it("assigns a one-based rank", () => {
    expect(calculateRank(0)).toBe(1);
    expect(calculateRank(8)).toBe(9);
  });
});
