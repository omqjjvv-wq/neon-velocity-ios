import { describe, expect, it } from "vitest";
import { isCurrentDeviceEntry } from "./leaderboardIdentity";

describe("leaderboard device identity", () => {
  const personal = { deviceId: "my-device" };

  it("only marks the signed-in anonymous device as the current player", () => {
    expect(isCurrentDeviceEntry("my-device", personal)).toBe(true);
    expect(isCurrentDeviceEntry("rival-device", personal)).toBe(false);
  });

  it("shows no stale YOU marker until the server confirms the newly claimed record", () => {
    expect(isCurrentDeviceEntry("android-record", null)).toBe(false);
    expect(isCurrentDeviceEntry("redmi-record", { deviceId: "redmi-record" })).toBe(true);
    expect(isCurrentDeviceEntry("android-record", { deviceId: "redmi-record" })).toBe(false);
  });
});
