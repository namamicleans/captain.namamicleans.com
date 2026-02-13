import "server-only";
import { JWTPayload, SignJWT, jwtVerify } from "jose";
import { UserResponse } from "@/types/auth";

const secretKey = process.env.SECRET_KEY || "secret";
const encodedKey = new TextEncoder().encode(secretKey);

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

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4w")
    .sign(encodedKey);
}

export async function decrypt(session?: string): Promise<JwtPayload | null> {
  try {
    if (!session) {
      return null;
    }

    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });

    return payload as JwtPayload;
  } catch {
    return null;
  }
}
