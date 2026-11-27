import { describe, expect, it } from "vitest";
import { calculateRank, shouldReplaceBestScore } from "./leaderboardRules";

type Record = { deviceId: string; score: number };

function submit(records: Record[], deviceId: string, score: number) {
  const current = records.find(record => record.deviceId === deviceId) ?? null;
  if (!current) records.push({ deviceId, score });
  else if (shouldReplaceBestScore(current.score, score)) current.score = score;
  const saved = records.find(record => record.deviceId === deviceId)!;
  return { bestScore: saved.score, rank: calculateRank(records.filter(record => record.score > saved.score).length) };
}

describe("anonymous leaderboard data flow", () => {
  it("stores one best score per anonymous device and returns its refreshed global rank", () => {
    const records: Record[] = [{ deviceId: "rival", score: 900 }];
    expect(submit(records, "device-a", 400)).toEqual({ bestScore: 400, rank: 2 });
    expect(submit(records, "device-a", 300)).toEqual({ bestScore: 400, rank: 2 });
    expect(submit(records, "device-a", 1200)).toEqual({ bestScore: 1200, rank: 1 });
    expect(records).toHaveLength(2);
  });
});
