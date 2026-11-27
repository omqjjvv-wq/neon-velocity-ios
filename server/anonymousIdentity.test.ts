import { describe, expect, it } from "vitest";
import { ANONYMOUS_DEVICE_COOKIE, createAnonymousLabel, issueAnonymousDeviceToken, normalizeDeviceFamily, readAnonymousDevice } from "./anonymousIdentity";

describe("anonymous device identity", () => {
  it("creates a short anonymous label from a device family and server identity", () => {
    expect(createAnonymousLabel("iPhone 15", "c8ee9af7-2f4c-4ca7-b361-7b5612d5a2ef")).toBe("iPhone 15 · A2EF");
  });

  it("removes unsafe display characters from device families", () => {
    expect(normalizeDeviceFamily("<Android / Model>")) .toBe("Android  Model");
    expect(normalizeDeviceFamily("")) .toBe("Device");
  });

  it("accepts only an issued signed device token", async () => {
    const device = { deviceId: "c8ee9af7-2f4c-4ca7-b361-7b5612d5a2ef", deviceLabel: "iPhone · A2EF" };
    const token = await issueAnonymousDeviceToken(device);
    const request = { headers: { cookie: `${ANONYMOUS_DEVICE_COOKIE}=${token}` } } as never;
    await expect(readAnonymousDevice(request)).resolves.toEqual(device);
    await expect(readAnonymousDevice({ headers: { cookie: `${ANONYMOUS_DEVICE_COOKIE}=invalid` } } as never)).resolves.toBeNull();
  });
});
