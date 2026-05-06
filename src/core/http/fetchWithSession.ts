import { getSession, invalidateSession } from "../auth/session";
import { refreshToken } from "../auth/sessionManager";
import { shouldRefreshToken } from "../auth/tokenHelpers";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";
import { UserResponse } from "@/types/auth";
import { catchError } from "@core/http/catchError";
import { createErrorResponse } from "@shared/response";
import { apiPost, apiPut } from "@core/http/client";
import type { JwtPayload } from "@core/auth/crypto";

type RequestFunction<Body, Response> =
  | ((endpoint: string, options?: RequestInit) => Promise<StandardApiResponse<Response> | Response>)
  | ((endpoint: string, body: Body, options?: RequestInit) => Promise<StandardApiResponse<Response> | Response>);

async function executeRequest<Body, Data>(
  requestFunction: RequestFunction<Body, Data>,
  endpoint: string,
  body: Body | undefined,
  options: RequestInit,
  headers: Record<string, string>,
): Promise<[Error | null, StandardApiResponse<Data> | Data | null]> {
  const isBodyRequired = requestFunction === apiPost || requestFunction === apiPut;

  const [errorResponse, data] = await catchError(
    isBodyRequired
      ? (requestFunction as (
          endpoint: string,
          body: Body,
          options?: RequestInit,
        ) => Promise<StandardApiResponse<Data> | Data>)(endpoint, body!, { ...options, headers })
      : (requestFunction as (
          endpoint: string,
          options?: RequestInit,
        ) => Promise<StandardApiResponse<Data> | Data>)(endpoint, { ...options, headers }),
  );

  const error = errorResponse ? new Error(errorResponse.message) : null;
  return [error, data];
}

function buildHeaders(accessToken: string, options: RequestInit): Record<string, string> {
  return {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${accessToken}`,
  };
}

async function runRefreshFlow(): Promise<{
  session: JwtPayload | null;
  result: ServerActionResponse<UserResponse>;
}> {
  // refreshToken() handles the API call, cookie update, and mutex
  const result = await refreshToken();

  if (!result.success) {
    if (result.code === "SESSION_EXPIRED" || result.code === "NO_REFRESH_TOKEN") {
      await invalidateSession();
    }
    return { session: null, result };
  }

  // Cookie was updated by refreshToken() — read the new session
  const session = await getSession();
  return { session, result };
}

export async function fetchWithSession<Body = undefined, Data = unknown>(
  requestFunction: RequestFunction<Body, Data>,
  endpoint: string,
  body?: Body,
  options: RequestInit = {},
): Promise<ServerActionResponse<Data>> {
  let session = await getSession();

  if (!session) {
    return createErrorResponse<Data>(
      "User not logged in. Please login to continue.",
      "UNAUTHORIZED",
    );
  }

  if (shouldRefreshToken(session)) {
    const { session: refreshedSession, result } = await runRefreshFlow();
    if (!refreshedSession) {
      return createErrorResponse<Data>(
        result.message || "Session expired. Please login again.",
        result.code || "SESSION_EXPIRED",
        result.error ?? null,
      );
    }
    session = refreshedSession;
  }

  const headers = buildHeaders(session.tokens.access, options);
  const [error, data] = await executeRequest(requestFunction, endpoint, body, options, headers);

  if (error) {
    return await handleRequestError(error, requestFunction, endpoint, body, options);
  }

  return data as ServerActionResponse<Data>;
}

async function handleRequestError<Body, Data>(
  error: Error & { code?: string; error?: unknown },
  requestFunction: RequestFunction<Body, Data>,
  endpoint: string,
  body: Body | undefined,
  options: RequestInit,
): Promise<ServerActionResponse<Data>> {
  if (error.code !== "HTTP_401") {
    return createErrorResponse<Data>(
      error.message,
      error.code ?? "UNKNOWN_ERROR",
      error.error ?? null,
    );
  }

  const { session: refreshedSession, result } = await runRefreshFlow();

  if (!refreshedSession) {
    return createErrorResponse<Data>(
      result.message || "Session expired. Please login again.",
      result.code || "SESSION_EXPIRED",
      result.error ?? null,
    );
  }

  const retryHeaders = buildHeaders(refreshedSession.tokens.access, options);
  const [retryError, retryData] = await executeRequest(
    requestFunction, endpoint, body, options, retryHeaders,
  );

  if (retryError) {
    const typed = retryError as Error & { code?: string; error?: unknown };
    return createErrorResponse<Data>(
      typed.message,
      typed.code ?? "UNKNOWN_ERROR",
      typed.error ?? null,
    );
  }

  return retryData as ServerActionResponse<Data>;
}
