import { cookies } from "next/headers";
import { getSession, refreshAccessToken, invalidateSession } from "../auth/session";
import { shouldRefreshToken } from "../auth/tokenHelpers";
import { ServerActionResponse, Session, StandardApiResponse } from "@/types/generic";
import { catchError } from "@core/http/catchError";
import { createErrorResponse } from "@shared/response";
import { apiPost, apiPut } from "@core/http/client";

type RefreshPayload = {
  session: Session;
  sessionValue: string;
  expiresAt: string;
};

let refreshPromise: Promise<ServerActionResponse<RefreshPayload>> | null = null;

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

function formatResponse<Data>(data: StandardApiResponse<Data> | Data): ServerActionResponse<Data> {
  // Backend always returns StandardApiResponse, just return it
  return data as StandardApiResponse<Data>;
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
      "UNAUTHORIZED"
    );
  }

  if (shouldRefreshToken(session)) {
    const { session: refreshedSession, result } = await runRefreshFlow();
    if (!refreshedSession) {
      return createErrorResponse<Data>(
        result.message || "Session expired. Please login again.",
        result.code || "SESSION_EXPIRED",
        result.error ?? null
      );
    }
    session = refreshedSession;
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${session.tokens.access}`,
  };

  const [error, data] = await executeRequest(requestFunction, endpoint, body, options, headers);

  if (error) {
    return await handleRequestError(error, requestFunction, endpoint, body, options);
  }

  return formatResponse(data!);
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
      error.error ?? null
    );
  }

  const { session: refreshedSession, result } = await runRefreshFlow();

  if (!refreshedSession) {
    return createErrorResponse<Data>(
      result.message || "Session expired. Please login again.",
      result.code || "SESSION_EXPIRED",
      result.error ?? null
    );
  }

  const retryHeaders: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${refreshedSession.tokens.access}`,
  };

  const [retryError, retryData] = await executeRequest(requestFunction, endpoint, body, options, retryHeaders);

  if (retryError) {
    const typedError = retryError as Error & { code?: string; error?: unknown };
    return createErrorResponse<Data>(
      typedError.message,
      typedError.code ?? "UNKNOWN_ERROR",
      typedError.error ?? null
    );
  }

  return formatResponse(retryData!);
}

async function runRefreshFlow(): Promise<{
  session: Session | null;
  result: ServerActionResponse<RefreshPayload>;
}> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken();
  }

  const result = await refreshPromise;
  refreshPromise = null;

  if (result.success && result.data) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: "session",
      value: result.data.sessionValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(result.data.expiresAt),
    });

    return {
      session: result.data.session,
      result,
    };
  }

  if (result.code === "SESSION_EXPIRED" || result.code === "NO_REFRESH_TOKEN") {
    await invalidateSession();
  }

  return {
    session: null,
    result,
  };
}
