import { describe, expect, it } from "vitest";
import { advanceErrorWave, createErrorAnomalySequence, ERROR_ANOMALY_COUNT, ERROR_WAVE_START_DISTANCE, getErrorAnomaly, getErrorAnomalyCatalog, getErrorAnomalyVariant, getErrorGameplayInterference, getErrorSpeedMultiplier, getErrorWaveFeedback, getErrorWaveRate, isErrorPreparationWindow, isMirrorAnomaly, makeErrorAnomalyRecord, recoverErrorWave } from "./errorDimension";

describe("ERROR DIMENSION shared runner rules", () => {
  it("contains the original eight plus 100 unique additional anomalies", () => {
    const catalog = getErrorAnomalyCatalog();
    expect(ERROR_ANOMALY_COUNT).toBe(109);
    expect(catalog).toHaveLength(109);
    expect(new Set(catalog.map(anomaly => anomaly.kind)).size).toBe(109);
    expect(catalog.some(anomaly => anomaly.kind === "debt")).toBe(true);
    expect(catalog.filter(anomaly => anomaly.kind.startsWith("anomaly-"))).toHaveLength(100);
    expect(getErrorGameplayInterference({ ...getErrorAnomaly(10, ["anomaly-100"])!, index: 0 }, 1).ghostDistraction).toBeGreaterThanOrEqual(0);
    expect(getErrorAnomalyVariant("anomaly-001").phase).not.toBe(getErrorAnomalyVariant("anomaly-011").phase);
    expect(getErrorAnomalyVariant("anomaly-001").frequency).not.toBe(getErrorAnomalyVariant("anomaly-011").frequency);
    expect(getErrorAnomalyVariant("anomaly-100").intensity).toBeLessThan(1.1);
  });
  it("keeps the first ten seconds on the original rules", () => {
    const sequence = createErrorAnomalySequence(8, () => .5);
    expect(getErrorAnomaly(9.99, sequence)).toBeNull();
    expect(getErrorAnomaly(10, sequence)?.kind).toBe(sequence[0]);
  });

  it("creates a fresh anomaly deck without adjacent duplicate rules", () => {
    const sequence = createErrorAnomalySequence(24, () => 0);
    expect(sequence).toHaveLength(24);
    sequence.slice(1).forEach((kind, index) => expect(kind).not.toBe(sequence[index]));
    expect(getErrorAnomaly(20, sequence)?.kind).toBe(sequence[1]);
    expect(getErrorAnomaly(30, sequence)?.kind).toBe(sequence[2]);
  });

  it("keeps each anomaly effect readable when selected from a run deck", () => {
    const mirror = getErrorAnomaly(40, ["echo", "prism", "echo", "mirror"]);
    const echo = getErrorAnomaly(10, ["echo"]);
    const surge = getErrorAnomaly(40, ["echo", "prism", "echo", "surge"]);
    expect(isMirrorAnomaly(mirror)).toBe(true);
    expect(isMirrorAnomaly(echo)).toBe(false);
    expect(getErrorSpeedMultiplier(surge)).toBe(1.03);
    expect(getErrorSpeedMultiplier(echo)).toBe(1);
  });

  it("records the time and description of every triggered anomaly", () => {
    const anomaly = getErrorAnomaly(21.7, ["echo", "prism"]);
    expect(anomaly).not.toBeNull();
    expect(makeErrorAnomalyRecord(anomaly!, 21.7)).toMatchObject({ kind: "prism", title: "稜鏡折射", triggeredAt: 20 });
  });

  it("moves the error wave toward the runner and accelerates on surge", () => {
    const normal = getErrorWaveRate(20, getErrorAnomaly(20, ["mirror", "echo"]));
    const surge = getErrorWaveRate(40, getErrorAnomaly(40, ["echo", "prism", "echo", "surge"]));
    expect(surge).toBeGreaterThan(normal);
    expect(advanceErrorWave(ERROR_WAVE_START_DISTANCE, 1, 20, getErrorAnomaly(20, ["echo"]))).toBeLessThan(ERROR_WAVE_START_DISTANCE);
    expect(advanceErrorWave(.2, 1, 40, getErrorAnomaly(40, ["surge"]))).toBe(0);
  });

  it("starts farther away and lets a crystal restore a more forgiving wave gap", () => {
    expect(ERROR_WAVE_START_DISTANCE).toBe(20);
    expect(recoverErrorWave(4)).toBe(6.5);
    expect(recoverErrorWave(ERROR_WAVE_START_DISTANCE)).toBe(ERROR_WAVE_START_DISTANCE);
  });

  it("gives each anomaly a distinct readable wave feedback", () => {
    const mirror = getErrorWaveFeedback({ kind: "mirror", index: 0, title: "鏡像指令", detail: "左右切線暫時互換" }, 1);
    const echo = getErrorWaveFeedback({ kind: "echo", index: 1, title: "殘響投影", detail: "下一波封鎖會短暫重影" }, 1);
    const prism = getErrorWaveFeedback({ kind: "prism", index: 2, title: "稜鏡折射", detail: "速度線與障礙色彩重新排列" }, 1);
    const surge = getErrorWaveFeedback({ kind: "surge", index: 3, title: "波形湧升", detail: "錯誤維度把速度再推高一階" }, 1);
    const text = getErrorWaveFeedback({ kind: "text", index: 4, title: "文字故障", detail: "3D 物件短暫切換成文字圖層" }, 1);
    const fullscreen = getErrorWaveFeedback({ kind: "fullscreen", index: 5, title: "全畫面錯誤", detail: "整個錯誤維度正在分層、錯位與重組" }, 1);
    const plane = getErrorWaveFeedback({ kind: "plane", index: 6, title: "平面切換", detail: "立體跑道短暫壓平成分層貼片" }, 1);
    const lag = getErrorWaveFeedback({ kind: "lag", index: 7, title: "超級卡頓", detail: "畫面出現跳幀殘影後重新對齊" }, 1);
    const debt = getErrorWaveFeedback({ kind: "debt", index: 8, title: "欠費版遊戲", detail: "文字、車與正方形圖案取代原始畫面" }, 1);
    expect(mirror.tilt).not.toBe(0);
    expect(echo.scaleX).not.toBe(1);
    expect(prism.scaleY).not.toBe(1);
    expect(surge.scaleX).toBe(1.12);
    expect(text.emissive).toBe("#FFFFFF");
    expect(fullscreen.scaleX).toBeGreaterThan(1);
    expect(plane.scaleX).toBe(1.42);
    expect(lag.scaleY).toBe(1.18);
    expect(debt.diffuse).toBe("#F4F1E8");
    expect(debt.scaleX).toBeLessThan(1);
    expect(getErrorGameplayInterference({ kind: "text", index: 4, title: "文字故障", detail: "3D 物件短暫切換成文字圖層" }, 1).ghostDistraction).toBeGreaterThan(0);
    expect(getErrorGameplayInterference({ kind: "fullscreen", index: 5, title: "全畫面錯誤", detail: "整個錯誤維度正在分層、錯位與重組" }, 1).wavePressure).toBeLessThan(1);
    expect(getErrorGameplayInterference({ kind: "plane", index: 6, title: "平面切換", detail: "立體跑道短暫壓平成分層貼片" }, 1).speedMultiplier).toBe(1);
    expect(getErrorGameplayInterference({ kind: "lag", index: 7, title: "超級卡頓", detail: "畫面出現跳幀殘影後重新對齊" }, 1).ghostDistraction).toBeGreaterThan(.5);
    expect(getErrorGameplayInterference({ kind: "debt", index: 8, title: "欠費版遊戲", detail: "文字、車與正方形圖案取代原始畫面" }, 1).wavePressure).toBeLessThan(1);
    expect(new Set([mirror.emissive, echo.emissive, prism.emissive, surge.emissive, text.emissive, fullscreen.emissive, plane.emissive, lag.emissive]).size).toBeGreaterThanOrEqual(6);
  });

  it("applies each anomaly's gameplay interference without changing collision ownership", () => {
    const mirror = getErrorGameplayInterference({ kind: "mirror", index: 0, title: "鏡像指令", detail: "左右切線暫時互換" }, 1);
    const echo = getErrorGameplayInterference({ kind: "echo", index: 1, title: "殘響投影", detail: "下一波封鎖會短暫重影" }, 1);
    const prism = getErrorGameplayInterference({ kind: "prism", index: 2, title: "稜鏡折射", detail: "速度線與障礙色彩重新排列" }, 1);
    const surge = getErrorGameplayInterference({ kind: "surge", index: 3, title: "波形湧升", detail: "錯誤維度把速度再推高一階" }, 1);
    expect(mirror.controlDirection).toBe(-1);
    expect(echo.ghostDistraction).toBeGreaterThan(0);
    expect(prism.laneSignalOffset).not.toBe(0);
    expect(surge.speedMultiplier).toBe(1.03);
    expect(surge.wavePressure).toBe(1.14);
  });

  it("shows a short preparation window before each anomaly", () => {
    expect(isErrorPreparationWindow(7.8)).toBe(true);
    expect(isErrorPreparationWindow(9.9)).toBe(true);
    expect(isErrorPreparationWindow(7.2)).toBe(false);
    expect(isErrorPreparationWindow(10)).toBe(false);
  });

  it("keeps the first three events visually real while preserving the low-pressure balance", () => {
    expect(getErrorAnomaly(10, ["surge"])?.kind).toBe("surge");
    expect(getErrorAnomaly(20, ["mirror", "surge"])?.kind).toBe("surge");
    expect(getErrorAnomaly(30, ["surge", "mirror", "surge"])?.kind).toBe("surge");
    expect(getErrorSpeedMultiplier(getErrorAnomaly(10, ["surge"]))).toBe(1.03);
    expect(getErrorAnomaly(40, ["echo", "prism", "echo"])).toBeNull();
  });
});
