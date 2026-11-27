import { parse as parseCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./_core/env";

export const ANONYMOUS_DEVICE_COOKIE = "nv_anonymous_device";
const ISSUER = "neon-velocity";
const AUDIENCE = "leaderboard";

export type AnonymousDevice = { deviceId: string; deviceLabel: string };

function signingKey() {
  if (!ENV.cookieSecret) throw new Error("Anonymous leaderboard signing secret is unavailable");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function normalizeDeviceFamily(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9 ._-]/g, "").trim().slice(0, 40);
  return normalized || "Device";
}

export function createAnonymousLabel(deviceFamily: string, deviceId: string) {
  const suffix = deviceId.replace(/-/g, "").slice(-4).toUpperCase();
  return `${normalizeDeviceFamily(deviceFamily)} · ${suffix}`;
}

export async function issueAnonymousDeviceToken(device: AnonymousDevice) {
  return new SignJWT({ deviceLabel: device.deviceLabel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(device.deviceId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(signingKey());
}

export async function readAnonymousDevice(req: Request): Promise<AnonymousDevice | null> {
  const token = parseCookie(req.headers.cookie ?? "")[ANONYMOUS_DEVICE_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: ISSUER, audience: AUDIENCE });
    const deviceId = payload.sub;
    const deviceLabel = typeof payload.deviceLabel === "string" ? payload.deviceLabel : "";
    if (!deviceId || !deviceLabel) return null;
    return { deviceId, deviceLabel };
  } catch {
    return null;
  }
}
