import "server-only";
import { cookies } from "next/headers";
import { apiPost } from "@core/http/client";
import { catchError } from "@core/http/catchError";
import { decrypt, encrypt } from "@core/auth/crypto";
import { createErrorResponse } from "@shared/response";
import { UserResponse } from "@/types/auth";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";

const ACCESS_TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23h — triggers refresh 1h before 24h backend expiry
const SESSION_COOKIE_TTL_MS = 28 * 24 * 60 * 60 * 1000; // 4 weeks, matches backend refresh token lifetime

let isRefreshing = false;
let pendingRefresh: Promise<ServerActionResponse<UserResponse>> | null = null;

async function doRefresh(): Promise<ServerActionResponse<UserResponse>> {
  // Read cookie directly to avoid a circular dependency with session.ts
  const cookieStore = await cookies();
  const raw = cookieStore.get("session")?.value;
  const session = await decrypt(raw);

  if (!session?.tokens.refresh) {
    return createErrorResponse<UserResponse>(
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
    return createErrorResponse<UserResponse>(
      "Session expired. Please login again.",
      "SESSION_EXPIRED",
      error.error,
    );
  }

  const standard = response as StandardApiResponse<UserResponse>;
  if (!standard.success || !standard.data) {
    return createErrorResponse<UserResponse>(
      standard.message || "Token refresh failed",
      standard.code,
      standard.error,
    );
  }

  const data = standard.data;
  const normalized: UserResponse = {
    ...data,
    user: {
      ...data.user,
      role: data.user.role ? data.user.role.toLowerCase().trim() : data.user.role,
    },
  };

  // Save new session (including the rotated refresh token) to cookie
  const tokenExpiry = Date.now() + ACCESS_TOKEN_TTL_MS;
  const sessionValue = await encrypt(normalized, tokenExpiry);

  cookieStore.set({
    name: "session",
    value: sessionValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + SESSION_COOKIE_TTL_MS),
  });

  return {
    success: true,
    message: "Session refreshed successfully",
    code: "TOKEN_REFRESHED",
    data: normalized,
    error: null,
  };
}

/**
 * Single source of truth for token refresh.
 * Saves the rotated refresh token to the cookie on every call so it is never
 * blacklisted on the next attempt. Uses a mutex to prevent concurrent calls
 * from sending the same refresh token twice.
 */
export async function refreshToken(): Promise<ServerActionResponse<UserResponse>> {
  if (isRefreshing && pendingRefresh) {
    return pendingRefresh;
  }

  isRefreshing = true;
  pendingRefresh = doRefresh().finally(() => {
    isRefreshing = false;
    pendingRefresh = null;
  });

  return pendingRefresh;
}
