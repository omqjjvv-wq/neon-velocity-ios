import { describe, expect, it } from "vitest";
import { createNeonHandleKey, hashGameCode, normalizeNeonName, verifyGameCode } from "./neonIdentity";

describe("NEON ID credentials", () => {
  it("normalizes a display name into one stable handle key", () => {
    expect(normalizeNeonName("  Neon   Pilot  ")).toBe("Neon Pilot");
    expect(createNeonHandleKey("neon pilot")).toBe(createNeonHandleKey("NEON PILOT"));
  });

  it("stores a game code as a salted hash and rejects a different code", () => {
    const stored = hashGameCode("240618");
    expect(stored).not.toContain("240618");
    expect(verifyGameCode("240618", stored)).toBe(true);
    expect(verifyGameCode("240619", stored)).toBe(false);
  });
});
