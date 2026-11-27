import { describe, expect, it } from "vitest";
import { isItchRelease } from "./releaseMode";

describe("release mode", () => {
  it("enables the itch.io-only build for the explicit flag", () => {
    expect(isItchRelease("1")).toBe(true);
    expect(isItchRelease(undefined)).toBe(false);
    expect(isItchRelease("0")).toBe(false);
  });
});
