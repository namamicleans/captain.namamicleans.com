"use server";

import { cookies } from "next/headers";
import { apiPost } from "@core/http/client";
import { catchError } from "@core/http/catchError";
import { shouldRefreshToken } from "@core/auth/tokenHelpers";
import { createErrorResponse } from "@shared/response";
import { UserResponse } from "@/types/auth";
import { ServerActionResponse, Session, StandardApiResponse } from "@/types/generic";
import { decrypt, encrypt, JwtPayload } from "./crypto";

const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE_TTL_MS = 28 * 24 * 60 * 60 * 1000; // 4 weeks

type RefreshPayload = {
  session: Session;
  sessionValue: string;
  expiresAt: string;
};

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

  // All responses are StandardApiResponse
  const standardResponse = response as StandardApiResponse<UserResponse>;
  if (!standardResponse.success || !standardResponse.data) {
    return createErrorResponse<UserResponse>(
      standardResponse.message || "Login failed",
      standardResponse.code,
      standardResponse.error,
    );
  }

  const data = standardResponse.data;

  const { payload, sessionValue, expiresAt } = await createSessionArtifacts(data);

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

export async function logout(): Promise<void> {
  await clearSessionCookie();
}

export async function refreshAccessToken(): Promise<ServerActionResponse<RefreshPayload>> {
  const session = await getSession();

  if (!session?.tokens.refresh) {
    return createErrorResponse<RefreshPayload>(
      "No refresh token available",
      "NO_REFRESH_TOKEN",
      null,
    );
  }

  const [error, response] = await catchError(
    apiPost<{ refresh: string }, UserResponse>("/api/auth/refresh/", {
      refresh: session.tokens.refresh,
    }),
  );

  if (error) {
    return createErrorResponse<RefreshPayload>(
      "Session expired. Please login again.",
      "SESSION_EXPIRED",
      error.error,
    );
  }

  // All responses are StandardApiResponse
  const standardResponse = response as StandardApiResponse<UserResponse>;
  if (!standardResponse.success || !standardResponse.data) {
    return createErrorResponse<RefreshPayload>(
      standardResponse.message || "Token refresh failed",
      standardResponse.code,
      standardResponse.error,
    );
  }

  const data = standardResponse.data;

  const { sessionValue, expiresAt, session: sessionDetails } = await createSessionArtifacts(data);

  return {
    success: true,
    message: "Session refreshed successfully",
    code: "TOKEN_REFRESHED",
    data: {
      session: sessionDetails,
      sessionValue,
      expiresAt,
    },
    error: null,
  };
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

  const refreshResult = await refreshAccessToken();

  if (!refreshResult.success || !refreshResult.data) {
    await clearSessionCookie();
    return createErrorResponse<{ refreshed: boolean }>(
      refreshResult.message || "Session refresh failed",
      refreshResult.code || "SESSION_REFRESH_FAILED",
      refreshResult.error ?? null,
    );
  }

  await setSessionCookie(
    refreshResult.data.sessionValue,
    new Date(refreshResult.data.expiresAt),
  );

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
  const normalizedUser = {
    ...data.user,
    role: data.user.role ? data.user.role.toLowerCase().trim() : data.user.role,
  };

  const normalizedPayload: UserResponse = {
    ...data,
    user: normalizedUser,
  };

  const tokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
  const sessionValue = await encrypt(normalizedPayload, tokenExpiry);
  const expiresAt = new Date(Date.now() + SESSION_COOKIE_TTL_MS).toISOString();

  const sessionDetails: Session = {
    user: normalizedPayload.user,
    tokens: normalizedPayload.tokens,
    tokenExpiry,
  };

  return {
    payload: normalizedPayload,
    sessionValue,
    expiresAt,
    session: sessionDetails,
  };
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
