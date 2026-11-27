/** DESIGN REMINDER — 以極少且明確的狀態表達高速遊戲的每個轉換。 */
export type GameMode = "ready" | "playing" | "paused" | "crashed";
export type GameVariant = "original" | "error-dimension";
export type ObstacleKind = "block" | "gate" | "crystal";
export type GameAction = "left" | "right" | "start" | "restart" | "pause" | "sprint-on" | "sprint-off" | "sprint-toggle";

export interface GameSnapshot {
  mode: GameMode;
  score: number;
  speed: number;
  chain: number;
  best: number;
}
