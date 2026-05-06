"use server";

import { cookies } from "next/headers";
import { apiPost } from "@core/http/client";
import { catchError } from "@core/http/catchError";
import { shouldRefreshToken } from "@core/auth/tokenHelpers";
import { refreshToken } from "@core/auth/sessionManager";
import { createErrorResponse } from "@shared/response";
import { UserResponse } from "@/types/auth";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";
import { decrypt, encrypt, JwtPayload } from "./crypto";

const ACCESS_TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
const SESSION_COOKIE_TTL_MS = 28 * 24 * 60 * 60 * 1000;

type Credentials = {
  email: string;
  password: string;
};

export async function login(formData: Credentials): Promise<ServerActionResponse<UserResponse>> {
  const [error, response] = await catchError(
    apiPost<Credentials, UserResponse>("/api/auth/login/", formData),
  );

  if (error) {
    return createErrorResponse<UserResponse>(
      error.message || "Login failed",
      error.code,
      error.error,
    );
  }

  const standardResponse = response as StandardApiResponse<UserResponse>;
  if (!standardResponse.success || !standardResponse.data) {
    return createErrorResponse<UserResponse>(
      standardResponse.message || "Login failed",
      standardResponse.code,
      standardResponse.error,
    );
  }

  const { sessionValue, expiresAt, payload } = await createSessionArtifacts(standardResponse.data);
  await setSessionCookie(sessionValue, new Date(expiresAt));

  return {
    success: true,
    message: "Login successful",
    code: "LOGIN_SUCCESS",
    data: payload,
    error: null,
  };
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  return decrypt(session);
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}

export async function refreshSessionIfNeeded(): Promise<ServerActionResponse<{ refreshed: boolean }>> {
  const session = await getSession();

  if (!session) {
    return createErrorResponse<{ refreshed: boolean }>(
      "No active session",
      "NO_SESSION",
      null,
    );
  }

  if (!shouldRefreshToken(session)) {
    return {
      success: true,
      message: "Session is still valid",
      code: "SESSION_VALID",
      data: { refreshed: false },
      error: null,
    };
  }

  // refreshToken() handles the API call, cookie update, and mutex
  const result = await refreshToken();

  if (!result.success) {
    await clearSessionCookie();
    return createErrorResponse<{ refreshed: boolean }>(
      result.message || "Session refresh failed",
      result.code || "SESSION_REFRESH_FAILED",
      result.error ?? null,
    );
  }

  return {
    success: true,
    message: "Session refreshed successfully",
    code: "TOKEN_REFRESHED",
    data: { refreshed: true },
    error: null,
  };
}

export async function invalidateSession(): Promise<ServerActionResponse<null>> {
  await clearSessionCookie();
  return {
    success: true,
    message: "Session cleared",
    code: "SESSION_INVALIDATED",
    data: null,
    error: null,
  };
}

async function createSessionArtifacts(data: UserResponse) {
  const normalized: UserResponse = {
    ...data,
    user: {
      ...data.user,
      role: data.user.role ? data.user.role.toLowerCase().trim() : data.user.role,
    },
  };

  const tokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
  const sessionValue = await encrypt(normalized, tokenExpiry);
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_TTL_MS).toISOString();

  return { payload: normalized, sessionValue, expiresAt };
}

async function setSessionCookie(value: string, expires: Date) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "session",
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
