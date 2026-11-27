import { describe, expect, it } from "vitest";
import { createRunShareData } from "./runShareData";

describe("run share data", () => {
  it("passes the latest completed run and its global rank to the score card", () => {
    expect(createRunShareData(209223, 1, "Redmi K30i 5G · BF1D")).toEqual({
      score: 209223,
      rank: 1,
      deviceLabel: "Redmi K30i 5G · BF1D",
      variant: "original",
    });
    expect(createRunShareData(209223, 1, "Redmi K30i 5G · BF1D", "error-dimension")?.variant).toBe("error-dimension");
  });

  it("does not produce share data before a real completed run has a device identity", () => {
    expect(createRunShareData(null, null, "Device · BF1D")).toBeNull();
    expect(createRunShareData(20, null, null)).toBeNull();
  });
});
