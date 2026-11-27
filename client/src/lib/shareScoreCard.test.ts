import { afterEach, describe, expect, it, vi } from "vitest";
import { renderScoreCard, scoreCardFilename, scoreCardText, shareScoreCard } from "./shareScoreCard";

function textRecordingContext() {
  const text: string[] = [];
  const target = { fillText: (value: string) => text.push(value) };
  const context = new Proxy(target, {
    get(object, key) {
      if (key in object) return object[key as keyof typeof object];
      return () => undefined;
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { context, text };
}

describe("share score card metadata", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("formats deterministic filenames for both game variants", () => {
    expect(scoreCardFilename(420)).toBe("neon-velocity-000420.png");
    expect(scoreCardFilename(420, "error-dimension")).toBe("neon-velocity-error-dimension-000420.png");
  });

  it("includes the actual run score and rank in the share message", () => {
    expect(scoreCardText({ score: 420, rank: 3, deviceLabel: "Device · 9ABC" })).toContain("420");
    expect(scoreCardText({ score: 420, rank: 3, deviceLabel: "Device · 9ABC" })).toContain("#3");
    expect(scoreCardText({ score: 420, rank: 3, deviceLabel: "Device · 9ABC", variant: "error-dimension" })).toContain("NEON VELOCITY:ERROR DIMENSION");
  });

  it("renders the latest true score, global rank and device label onto the card", () => {
    const { context, text } = textRecordingContext();
    renderScoreCard(context, { score: 209223, rank: 1, deviceLabel: "Redmi K30i 5G · BF1D", variant: "error-dimension" });
    expect(text).toContain("209223");
    expect(text).toContain("#01");
    expect(text).toContain("REDMI K30I 5G · BF1D");
    expect(text).toContain("ERROR DIMENSION／錯誤維度");
  });

  it("shares a PNG payload generated from the latest run data", async () => {
    const { context, text } = textRecordingContext();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        getContext: () => context,
        toBlob: (callback: BlobCallback) => callback(new Blob(["png"], { type: "image/png" })),
      })),
    });
    vi.stubGlobal("navigator", { share, canShare: vi.fn(() => true) });
    const run = { score: 209223, rank: 1, deviceLabel: "Redmi K30i 5G · BF1D" };
    await expect(shareScoreCard(run)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: scoreCardText(run) }));
    expect(text).toContain("209223");
    expect(text).toContain("#01");
    expect(text).toContain("REDMI K30I 5G · BF1D");
  });
});
