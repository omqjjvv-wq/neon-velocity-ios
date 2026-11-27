export type ErrorAnomalyKind = "mirror" | "echo" | "prism" | "surge" | "text" | "fullscreen" | "plane" | "lag" | "debt" | `anomaly-${string}`;

export type ErrorAnomaly = {
  index: number;
  kind: ErrorAnomalyKind;
  title: string;
  detail: string;
};

export type ErrorAnomalyRecord = ErrorAnomaly & {
  triggeredAt: number;
};

type ErrorAnomalyDefinition = Omit<ErrorAnomaly, "index">;

const CORE_ANOMALIES: readonly ErrorAnomalyDefinition[] = [
  { kind: "mirror", title: "鏡像指令", detail: "左右切線暫時互換" },
  { kind: "echo", title: "殘響投影", detail: "下一波封鎖會短暫重影" },
  { kind: "prism", title: "稜鏡折射", detail: "速度線與障礙色彩重新排列" },
  { kind: "surge", title: "波形湧升", detail: "錯誤維度把速度再推高一階" },
  { kind: "text", title: "文字故障", detail: "3D 物件短暫切換成文字圖層" },
  { kind: "fullscreen", title: "全畫面錯誤", detail: "整個錯誤維度正在分層、錯位與重組" },
  { kind: "plane", title: "平面切換", detail: "立體跑道短暫壓平成分層貼片" },
  { kind: "lag", title: "超級卡頓", detail: "畫面出現跳幀殘影後重新對齊" },
  { kind: "debt", title: "欠費版遊戲", detail: "文字、車與正方形圖案取代原始畫面" },
];

const EXTRA_FAMILIES = [
  ["切片偏移", "跑道切片短暫錯開"], ["殘影複寫", "視覺殘影掠過安全線"], ["色票漂移", "車道色票短暫交換"], ["節拍脈衝", "速度線按錯誤節拍閃動"], ["座標折疊", "標記在相鄰座標間跳動"],
  ["字元散列", "字元片段沿跑道散開"], ["邊界閃爍", "跑道邊界出現亮色斷點"], ["波面折返", "錯誤波表面短暫折返"], ["訊號重播", "方向訊號延遲一拍重播"], ["維度重取樣", "整體畫面以新取樣短暫刷新"],
] as const;
const EXTRA_ANOMALIES: readonly ErrorAnomalyDefinition[] = Array.from({ length: 100 }, (_, index) => {
  const family = EXTRA_FAMILIES[index % EXTRA_FAMILIES.length];
  const serial = String(index + 1).padStart(3, "0");
  return { kind: `anomaly-${serial}`, title: `${family[0]} ${serial}`, detail: family[1] };
});
const ANOMALIES: readonly ErrorAnomalyDefinition[] = [...CORE_ANOMALIES, ...EXTRA_ANOMALIES];
export const ERROR_ANOMALY_COUNT = ANOMALIES.length;
const ANOMALY_BY_KIND = new Map(ANOMALIES.map(anomaly => [anomaly.kind, anomaly]));
export const isKnownErrorAnomalyKind = (value: string): value is ErrorAnomalyKind => ANOMALY_BY_KIND.has(value as ErrorAnomalyKind);
export const getErrorAnomalyCatalog = () => ANOMALIES.slice();
export const getErrorAnomalyFamily = (kind: ErrorAnomalyKind | null | undefined) => {
  if (!kind) return -1;
  const extraMatch = kind.match(/^anomaly-(\d{3})$/);
  if (extraMatch) return (Number(extraMatch[1]) - 1) % 10;
  return ({ mirror: 4, echo: 1, prism: 2, surge: 3, text: 5, fullscreen: 9, plane: 6, lag: 7, debt: 5 } as Record<string, number>)[kind] ?? 0;
};

export type ErrorAnomalyVariant = { serial: number; family: number; phase: number; frequency: number; intensity: number };
export const getErrorAnomalyVariant = (kind: ErrorAnomalyKind | null | undefined): ErrorAnomalyVariant => {
  const match = kind?.match(/^anomaly-(\d{3})$/);
  const serial = match ? Number(match[1]) : 0;
  const family = getErrorAnomalyFamily(kind);
  return { serial, family, phase: serial * .37 + family * .81, frequency: 8 + (serial % 7) * .7, intensity: .85 + (serial % 9) * .025 };
};
const DEFAULT_SEQUENCE = ANOMALIES.map(anomaly => anomaly.kind);
/** Create one run's anomaly deck. Adjacent events never use the same rule. */
export function createErrorAnomalySequence(length = 64, random: () => number = Math.random, previous?: ErrorAnomalyKind): ErrorAnomalyKind[] {
  const deck: ErrorAnomalyKind[] = previous ? [previous] : [];
  const size = Math.max(1, Math.floor(length));
  for (let index = 0; index < size; index += 1) {
    const candidates = ANOMALIES.filter(anomaly => anomaly.kind !== deck.at(-1));
    const pick = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
    deck.push(candidates[pick].kind);
  }
  return previous ? deck.slice(1) : deck;
}

export function getErrorAnomaly(elapsed: number, sequence: readonly ErrorAnomalyKind[] = DEFAULT_SEQUENCE): ErrorAnomaly | null {
  if (elapsed < 10 || sequence.length === 0) return null;
  const index = Math.floor(elapsed / 10) - 1;
  if (index >= sequence.length) return null;
  const kind = sequence[index];
  const anomaly = ANOMALY_BY_KIND.get(kind);
  if (!anomaly) return null;
  return { index, ...anomaly };
}

export function makeErrorAnomalyRecord(anomaly: ErrorAnomaly, elapsed: number): ErrorAnomalyRecord {
  return { ...anomaly, triggeredAt: Math.max(10, Math.floor(elapsed / 10) * 10) };
}

export type ErrorGameplayInterference = {
  controlDirection: 1 | -1;
  laneSignalOffset: number;
  speedMultiplier: number;
  ghostDistraction: number;
  wavePressure: number;
};

export function getErrorGameplayInterference(anomaly: ErrorAnomaly | null, elapsed = 0): ErrorGameplayInterference {
  const extraMatch = anomaly?.kind.match(/^anomaly-(\\d{3})$/);
  if (extraMatch) {
    const variant = getErrorAnomalyVariant(anomaly?.kind);
    const family = variant.family;
    const offset = Math.sin(elapsed * variant.frequency + variant.phase) * (0.18 + (family % 4) * .12) * variant.intensity;
    const familyInterference: ErrorGameplayInterference[] = [
      { controlDirection: 1, laneSignalOffset: offset, speedMultiplier: 1, ghostDistraction: .12, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset, speedMultiplier: 1, ghostDistraction: .45, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset * 2.2, speedMultiplier: 1, ghostDistraction: .18, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset, speedMultiplier: 1.015, ghostDistraction: 0, wavePressure: 1.04 },
      { controlDirection: -1, laneSignalOffset: offset * .7, speedMultiplier: 1, ghostDistraction: .12, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset * 1.4, speedMultiplier: 1, ghostDistraction: .38, wavePressure: .99 },
      { controlDirection: 1, laneSignalOffset: offset, speedMultiplier: 1, ghostDistraction: .2, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset, speedMultiplier: 1, ghostDistraction: .16, wavePressure: .97 },
      { controlDirection: 1, laneSignalOffset: offset * 1.7, speedMultiplier: 1, ghostDistraction: .22, wavePressure: 1 },
      { controlDirection: 1, laneSignalOffset: offset * 1.1, speedMultiplier: 1, ghostDistraction: .3, wavePressure: .98 },
    ];
    return familyInterference[family];
  }
  switch (anomaly?.kind) {
    case "mirror":
      return { controlDirection: -1, laneSignalOffset: Math.sin(elapsed * 11) * .9, speedMultiplier: 1, ghostDistraction: 0, wavePressure: 1 };
    case "echo":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 8) * .34, speedMultiplier: 1, ghostDistraction: 1, wavePressure: 1 };
    case "prism":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 13) * 1.1, speedMultiplier: 1, ghostDistraction: .2, wavePressure: 1 };
    case "surge":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 15) * .22, speedMultiplier: 1.03, ghostDistraction: 0, wavePressure: 1.14 };
    case "text":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 17) * .55, speedMultiplier: 1, ghostDistraction: .35, wavePressure: 1 };
    case "fullscreen":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 21) * .32, speedMultiplier: 1, ghostDistraction: .25, wavePressure: .98 };
    case "plane":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 6) * .28, speedMultiplier: 1, ghostDistraction: .16, wavePressure: .99 };
    case "lag":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 4) * .14, speedMultiplier: 1, ghostDistraction: .62, wavePressure: .98 };
    case "debt":
      return { controlDirection: 1, laneSignalOffset: Math.sin(elapsed * 3) * .08, speedMultiplier: 1, ghostDistraction: .12, wavePressure: .96 };
    default:
      return { controlDirection: 1, laneSignalOffset: 0, speedMultiplier: 1, ghostDistraction: 0, wavePressure: 1 };
  }
}

export function getErrorSpeedMultiplier(anomaly: ErrorAnomaly | null) {
  return getErrorGameplayInterference(anomaly).speedMultiplier;
}

export function isMirrorAnomaly(anomaly: ErrorAnomaly | null) {
  return anomaly?.kind === "mirror";
}

export const ERROR_WAVE_START_DISTANCE = 20;
export const ERROR_PREPARATION_SECONDS = 2.2;

export function isErrorPreparationWindow(elapsed: number) {
  if (elapsed <= 0) return false;
  const untilAnomaly = 10 - (elapsed % 10);
  return untilAnomaly > 0 && untilAnomaly <= ERROR_PREPARATION_SECONDS;
}

export type ErrorWaveFeedback = {
  scaleX: number;
  scaleY: number;
  tilt: number;
  diffuse: string;
  emissive: string;
};

export function getErrorWaveFeedback(anomaly: ErrorAnomaly | null, elapsed: number): ErrorWaveFeedback {
  const kind = anomaly?.kind;
  return {
    scaleX: kind === "echo" ? 1.08 + Math.sin(elapsed * 8) * .12 : kind === "surge" ? 1.12 : kind === "text" ? 1.18 + Math.sin(elapsed * 18) * .14 : kind === "fullscreen" ? 1.28 + Math.sin(elapsed * 23) * .18 : kind === "plane" ? 1.42 : kind === "lag" ? 1.06 + Math.sin(elapsed * 3) * .1 : kind === "debt" ? .92 + Math.sin(elapsed * 4) * .06 : 1,
    scaleY: kind === "prism" ? 1.24 + Math.sin(elapsed * 5) * .2 : kind === "mirror" ? 1 + Math.sin(elapsed * 6) * .08 : kind === "text" ? 1.08 : kind === "fullscreen" ? 1.3 + Math.sin(elapsed * 19) * .2 : kind === "plane" ? .72 : kind === "lag" ? 1.18 : kind === "debt" ? .88 + Math.sin(elapsed * 3) * .05 : 1,
    tilt: kind === "mirror" ? Math.sin(elapsed * 7) * .12 : kind === "text" ? Math.sin(elapsed * 12) * .08 : kind === "fullscreen" ? Math.sin(elapsed * 17) * .16 : kind === "plane" ? Math.sin(elapsed * 2) * .18 : kind === "lag" ? Math.sin(elapsed * 4) * .05 : kind === "debt" ? Math.sin(elapsed * 2) * .04 : 0,
    diffuse: kind === "prism" ? "#FFCF5A" : kind === "surge" ? "#FF6B5A" : kind === "text" ? "#66E3FF" : kind === "fullscreen" ? "#FF66C4" : kind === "plane" ? "#B6FF6A" : kind === "lag" ? "#A78BFA" : kind === "debt" ? "#F4F1E8" : "#A78BFA",
    emissive: kind === "echo" ? "#66E3FF" : kind === "mirror" ? "#FF66C4" : kind === "surge" ? "#FF4D00" : kind === "text" ? "#FFFFFF" : kind === "fullscreen" ? "#FFFFFF" : kind === "plane" ? "#B6FF6A" : kind === "lag" ? "#A78BFA" : kind === "debt" ? "#FF4D00" : "#FFCF5A",
  };
}

export function getErrorWaveRate(elapsed: number, anomaly: ErrorAnomaly | null) {
  const gradualPressure = Math.min(.38, Math.max(0, elapsed) / 160);
  return .24 + gradualPressure * (anomaly?.kind === "surge" ? 1.05 : 1);
}

export function advanceErrorWave(distance: number, delta: number, elapsed: number, anomaly: ErrorAnomaly | null) {
  return Math.max(0, distance - Math.max(0, delta) * getErrorWaveRate(elapsed, anomaly));
}

export function recoverErrorWave(distance: number, amount = 2.5) {
  return Math.min(ERROR_WAVE_START_DISTANCE, distance + Math.max(0, amount));
}
