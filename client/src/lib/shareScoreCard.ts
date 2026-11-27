export type ScoreCardVariant = "original" | "error-dimension";

export type ScoreCardData = {
  score: number;
  rank: number | null;
  deviceLabel: string;
  variant?: ScoreCardVariant;
};

function gameTitle(variant: ScoreCardVariant = "original") {
  return variant === "error-dimension" ? "NEON VELOCITY:ERROR DIMENSION" : "NEON VELOCITY";
}

export function scoreCardFilename(score: number, variant: ScoreCardVariant = "original") {
  const prefix = variant === "error-dimension" ? "neon-velocity-error-dimension" : "neon-velocity";
  return `${prefix}-${String(score).padStart(6, "0")}.png`;
}

export function scoreCardText(data: ScoreCardData) {
  const rank = data.rank ? `#${data.rank}` : "同步中";
  return `${gameTitle(data.variant)} — 本次衝刺分數 ${data.score}，全球名次 ${rank}。`;
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function renderScoreCard(ctx: CanvasRenderingContext2D, data: ScoreCardData) {
  const paper = "#F4F1E8";
  const graphite = "#0E1014";
  const orange = "#FF4D00";
  const mint = "#A5FFD6";
  ctx.fillStyle = graphite;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.globalAlpha = .16;
  for (let y = 0; y < 1350; y += 54) line(ctx, 0, y, 1080, y, paper, 1);
  ctx.globalAlpha = 1;

  ctx.fillStyle = orange;
  ctx.fillRect(72, 72, 18, 108);
  ctx.fillStyle = paper;
  ctx.font = "700 50px Arial, sans-serif";
  ctx.fillText("NEON", 118, 117);
  ctx.fillText("VELOCITY", 118, 168);
  ctx.fillStyle = orange;
  ctx.font = "600 20px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(data.variant === "error-dimension" ? "ERROR DIMENSION／錯誤維度" : "01／極速系統", 118, 206);

  ctx.fillStyle = orange;
  ctx.fillRect(72, 292, 936, 4);
  ctx.fillStyle = paper;
  ctx.font = "600 22px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("本次衝刺分數", 72, 340);
  ctx.font = "700 190px Arial, sans-serif";
  ctx.fillText(String(data.score).padStart(6, "0"), 64, 498);

  ctx.fillStyle = orange;
  ctx.fillRect(72, 568, 936, 4);
  ctx.fillStyle = paper;
  ctx.font = "600 22px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("全球最佳名次", 72, 617);
  ctx.fillStyle = mint;
  ctx.font = "700 128px Arial, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(data.rank ? `#${String(data.rank).padStart(2, "0")}` : "同步中", 66, 737);

  ctx.fillStyle = "rgba(244,241,232,.62)";
  ctx.font = "600 20px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(data.deviceLabel.toUpperCase(), 72, 796);

  const baseY = 1190;
  ctx.fillStyle = "#252A31";
  ctx.beginPath();
  ctx.moveTo(210, baseY);
  ctx.lineTo(870, baseY);
  ctx.lineTo(1000, 1340);
  ctx.lineTo(80, 1340);
  ctx.closePath();
  ctx.fill();
  line(ctx, 286, baseY, 220, 1340, paper, 8);
  line(ctx, 792, baseY, 860, 1340, paper, 8);
  line(ctx, 360, baseY, 332, 1340, orange, 7);
  line(ctx, 718, baseY, 748, 1340, orange, 7);
  for (let y = baseY + 50; y < 1330; y += 58) line(ctx, 540, y, 540, y + 28, paper, 7);

  ctx.fillStyle = orange;
  ctx.fillRect(72, 912, 72, 6);
  ctx.fillStyle = paper;
  ctx.font = "600 22px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText(data.variant === "error-dimension" ? "錯誤波必須慢過反應" : "反應必須快過撞擊", 164, 920);
  ctx.fillStyle = "rgba(244,241,232,.55)";
  ctx.font = "500 18px 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("NEONGAME-IXRSWQYN.MANUS.SPACE", 72, 978);
}

export async function createScoreCard(data: ScoreCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Score card canvas is unavailable");
  renderScoreCard(ctx, data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Score card could not be encoded")), "image/png");
  });
}

export async function shareScoreCard(data: ScoreCardData) {
  const file = new File([await createScoreCard(data)], scoreCardFilename(data.score, data.variant), { type: "image/png" });
  const shareData = { title: gameTitle(data.variant), text: scoreCardText(data), files: [file] };
  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    await navigator.share(shareData);
    return "shared" as const;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded" as const;
}
