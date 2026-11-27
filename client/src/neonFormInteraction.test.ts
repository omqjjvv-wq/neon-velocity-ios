import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("NEON ID form interaction layer", () => {
  it("explicitly enables pointer events on the form panel above the non-interactive game HUD", () => {
    const panelRule = stylesheet.match(/\.nv-neon-panel\s*\{[^}]*\}/)?.[0] ?? "";
    expect(panelRule).toContain("pointer-events: auto");
    expect(panelRule).toContain("touch-action: manipulation");
  });
});
