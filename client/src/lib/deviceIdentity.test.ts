import { describe, expect, it } from "vitest";

describe("anonymous device label format", () => {
  it("uses a short anonymous suffix without requiring an account name", () => {
    const id = "c8ee9af7-2f4c-4ca7-b361-7b5612d5a2ef";
    expect(id.replace(/-/g, "").slice(-4).toUpperCase()).toBe("A2EF");
  });
});
