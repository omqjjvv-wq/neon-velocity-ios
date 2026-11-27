export const SPRINT_MULTIPLIER = 1.85;

export function getHudSpeed(elapsed: number, sprinting: boolean) {
  const base = 340 + Math.min(680, Math.max(0, elapsed) * 28);
  return Math.round(base * (sprinting ? SPRINT_MULTIPLIER : 1));
}

export function getWorldSpeed(elapsed: number, sprinting: boolean) {
  const base = 35 + Math.min(75, Math.max(0, elapsed) * 2.5);
  return base * (sprinting ? SPRINT_MULTIPLIER : 1);
}

export function getDifficultyLevel(elapsed: number) {
  return 1 + Math.max(0, elapsed) / 7;
}

export function getObstacleSpawnDelay(elapsed: number) {
  return Math.max(.36, 1.28 - getDifficultyLevel(elapsed) * .1);
}

export function getCompatPace(elapsed: number, sprinting: boolean) {
  const safeElapsed = Math.max(0, elapsed);
  const multiplier = sprinting ? SPRINT_MULTIPLIER : 1;
  return {
    speed: getHudSpeed(safeElapsed, sprinting),
    tickMs: Math.max(34, 94 - safeElapsed * 1.7) / (sprinting ? 1.3 : 1),
    warningMs: Math.max(260, 720 - safeElapsed * 10) / (sprinting ? 1.16 : 1),
    spawnEvery: Math.max(8, 14 - Math.floor(safeElapsed / 6)),
    scoreStep: Math.round((8 + safeElapsed * 1.6) * Math.min(multiplier, 1.45)),
  };
}
