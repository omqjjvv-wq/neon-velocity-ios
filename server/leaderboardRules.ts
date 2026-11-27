export function shouldReplaceBestScore(currentBest: number | null, submittedScore: number) {
  return currentBest === null || submittedScore > currentBest;
}

export function calculateRank(scoresAbove: number) {
  return Math.max(1, scoresAbove + 1);
}
