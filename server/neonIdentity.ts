import { parse as parseCookie } from "cookie";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./_core/env";

export const NEON_SESSION_COOKIE = "nv_neon_session";
const ISSUER = "neon-velocity";
const AUDIENCE = "neon-id";

export type NeonSession = { playerId: number; displayName: string };

function signingKey() {
  if (!ENV.cookieSecret) throw new Error("NEON ID signing secret is unavailable");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function normalizeNeonName(value: string) {
  return value.trim().replace(/\s+/g, " ").normalize("NFKC");
}

export function createNeonHandleKey(displayName: string) {
  return normalizeNeonName(displayName).toLocaleUpperCase("en-US");
}

export function hashGameCode(gameCode: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(gameCode, salt, 64).toString("hex");
  return `scrypt$${salt.toString("hex")}$${derived}`;
}

export function verifyGameCode(gameCode: string, storedHash: string) {
  const [algorithm, saltHex, derivedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !derivedHex) return false;
  try {
    const actual = scryptSync(gameCode, Buffer.from(saltHex, "hex"), 64);
    const expected = Buffer.from(derivedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function issueNeonSession(session: NeonSession) {
  return new SignJWT({ displayName: session.displayName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.playerId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(signingKey());
}

export async function readNeonSession(req: Request): Promise<NeonSession | null> {
  const token = parseCookie(req.headers.cookie ?? "")[NEON_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: ISSUER, audience: AUDIENCE });
    const playerId = Number(payload.sub);
    const displayName = typeof payload.displayName === "string" ? payload.displayName : "";
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !displayName) return null;
    return { playerId, displayName };
  } catch {
    return null;
  }
}
