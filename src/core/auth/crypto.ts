import "server-only";
import { EncryptJWT, JWTPayload, jwtDecrypt } from "jose";
import { UserResponse } from "@/types/auth";

// Checked lazily (not at module load) because Next.js evaluates route
// modules during `next build` to collect page data, and SECRET_KEY is a
// Cloudflare Workers runtime secret — it's genuinely absent at build time,
// so an eager check here would fail every build, not just a misconfigured
// deploy.
//
// A256GCM needs a 32-byte key; derive one from the configured secret so any
// length/format of SECRET_KEY works, and cache it across calls.
let encodedKeyPromise: Promise<Uint8Array> | null = null;
function getEncodedKey(): Promise<Uint8Array> {
  if (!encodedKeyPromise) {
    const secretKeyEnv = process.env.SECRET_KEY;
    if (!secretKeyEnv) {
      throw new Error(
        "SECRET_KEY environment variable is not set. Refusing to sign or read sessions: without it, session tokens cannot be securely encrypted.",
      );
    }
    encodedKeyPromise = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(secretKeyEnv))
      .then((digest) => new Uint8Array(digest));
  }
  return encodedKeyPromise;
}

export interface JwtPayload extends JWTPayload {
  user: UserResponse["user"];
  tokens: UserResponse["tokens"];
  tokenExpiry?: number;
}

export async function encrypt(
  payload: UserResponse,
  tokenExpiry?: number
): Promise<string> {
  const expiry = tokenExpiry ?? Date.now() + 23 * 60 * 60 * 1000;

  const jwtPayload: JwtPayload = {
    user: payload.user,
    tokens: payload.tokens,
    tokenExpiry: expiry,
  };

  // The session cookie carries live backend access/refresh tokens, so it
  // must be encrypted (JWE), not just signed (JWS) — signing alone leaves
  // the payload readable to anything that can see the raw cookie value.
  return new EncryptJWT(jwtPayload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("4w")
    .encrypt(await getEncodedKey());
}

export async function decrypt(session?: string): Promise<JwtPayload | null> {
  try {
    if (!session) {
      return null;
    }

    const { payload } = await jwtDecrypt(session, await getEncodedKey());

    return payload as JwtPayload;
  } catch {
    return null;
  }
}
