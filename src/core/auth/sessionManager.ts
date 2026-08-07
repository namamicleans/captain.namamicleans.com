import "server-only";
import { cookies } from "next/headers";
import { apiPost } from "@core/http/client";
import { catchError } from "@core/http/catchError";
import { decrypt, encrypt, JwtPayload } from "@core/auth/crypto";
import { createErrorResponse } from "@shared/response";
import { UserResponse } from "@/types/auth";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";

const ACCESS_TOKEN_TTL_MS = 23 * 60 * 60 * 1000; // 23h — triggers refresh 1h before 24h backend expiry
const SESSION_COOKIE_TTL_MS = 28 * 24 * 60 * 60 * 1000; // 4 weeks, matches backend refresh token lifetime

// Keyed by refresh token (not a single global flag) — this module's state is
// shared across every concurrent request handled by the same server
// instance/isolate, regardless of which captain made the request. A single
// shared boolean+promise meant one captain's in-flight refresh could be
// handed back as the "result" of a completely different captain's refresh
// call, whose own cookie then never actually got rewritten with new tokens
// (only the captain whose request context originally called doRefresh() has
// theirs written, since next/headers' cookies() is bound to that request).
// Keying by the actual refresh token scopes the dedupe to genuine duplicate
// calls from the same session, never across two different captains'.
const pendingRefreshes = new Map<string, Promise<ServerActionResponse<UserResponse>>>();

async function doRefresh(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  session: JwtPayload,
): Promise<ServerActionResponse<UserResponse>> {
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
 * blacklisted on the next attempt. Dedupes concurrent calls that share the
 * same refresh token so it's never sent twice, without conflating unrelated
 * captains' concurrent refreshes with each other (see note on
 * `pendingRefreshes` above).
 */
export async function refreshToken(): Promise<ServerActionResponse<UserResponse>> {
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

  const key = session.tokens.refresh;
  const existing = pendingRefreshes.get(key);
  if (existing) {
    return existing;
  }

  const pending = doRefresh(cookieStore, session).finally(() => {
    pendingRefreshes.delete(key);
  });
  pendingRefreshes.set(key, pending);

  return pending;
}
