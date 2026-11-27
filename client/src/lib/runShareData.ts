import type { ScoreCardData, ScoreCardVariant } from "./shareScoreCard";

export function createRunShareData(score: number | null, rank: number | null, identityLabel: string | null, variant: ScoreCardVariant = "original"): ScoreCardData | null {
  if (score === null || score < 0 || !identityLabel) return null;
  return { score, rank, deviceLabel: identityLabel, variant };
}
