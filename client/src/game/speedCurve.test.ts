import { describe, expect, it } from "vitest";
import { getCompatPace, getHudSpeed, getObstacleSpawnDelay, getWorldSpeed } from "./speedCurve";

describe("NEON VELOCITY speed curve", () => {
  it("creates a clearly faster late run and applies sprint as an immediate multiplier", () => {
    expect(getHudSpeed(20, false)).toBeGreaterThan(getHudSpeed(0, false) + 500);
    expect(getWorldSpeed(20, false)).toBeGreaterThan(getWorldSpeed(0, false) * 2);
    expect(getHudSpeed(12, true)).toBeGreaterThan(getHudSpeed(12, false));
    expect(getObstacleSpawnDelay(30)).toBeLessThan(getObstacleSpawnDelay(0));
  });

  it("makes the 2D compatibility runner quicker over time and on sprint", () => {
    const opening = getCompatPace(0, false);
    const lateSprint = getCompatPace(30, true);
    expect(lateSprint.tickMs).toBeLessThan(opening.tickMs);
    expect(lateSprint.warningMs).toBeLessThan(opening.warningMs);
    expect(lateSprint.speed).toBeGreaterThan(opening.speed);
  });
});
