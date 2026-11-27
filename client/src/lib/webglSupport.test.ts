import { describe, expect, it } from "vitest";
import { canUseWebGL } from "./webglSupport";

describe("WebGL support detection", () => {
  it("accepts either WebGL 2 or WebGL 1 and rejects a browser without a rendering context", () => {
    const webgl2Document = { createElement: () => ({ getContext: (kind: string) => kind === "webgl2" ? {} : null }) };
    const noWebglDocument = { createElement: () => ({ getContext: () => null }) };

    expect(canUseWebGL(webgl2Document)).toBe(true);
    expect(canUseWebGL(noWebglDocument)).toBe(false);
  });
});
