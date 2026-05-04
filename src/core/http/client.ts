"use server";

import { HttpError } from "@core/http/errors";
import { StandardApiResponse } from "@/types/generic";

const BASE_URL: string = process.env.SERVER_URL || "http://localhost:8000";

const DEFAULT_HEADERS: Readonly<Record<string, string>> = {};

const apiRequest = async <ResponseType>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 10000,
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
    signal: controller.signal,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (response.status === 204) {
      return {
        success: true,
        message: "No content",
        code: "NO_CONTENT",
        data: null,
        error: null,
      } as StandardApiResponse<ResponseType>;
    }

    const payload = await response.json() as StandardApiResponse<ResponseType>;

    // Normalize error responses where HTTP status doesn't match success flag
    if (!response.ok && payload.success) {
      payload.success = false;
      payload.error = payload.error || JSON.stringify({
        httpStatus: response.status,
        statusText: response.statusText,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    if (error instanceof HttpError) {
      throw error;
    }
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message || "Unknown error"
        : String(error);
    throw new HttpError(500, message, endpoint);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const apiGet = async <ResponseType>(
  endpoint: string,
  options: RequestInit = {},
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  return apiRequest<ResponseType>(endpoint, {
    method: "GET",
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  });
};

export const apiPost = async <RequestBody, ResponseType>(
  endpoint: string,
  body?: RequestBody,
  options: RequestInit = {},
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  const isFormData = body instanceof FormData;
  return apiRequest<ResponseType>(endpoint, {
    method: "POST",
    body: isFormData ? body : JSON.stringify(body),
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
};

export const apiPut = async <RequestBody, ResponseType>(
  endpoint: string,
  body?: RequestBody,
  options: RequestInit = {},
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  const isFormData = body instanceof FormData;
  return apiRequest<ResponseType>(endpoint, {
    method: "PUT",
    body: isFormData ? body : JSON.stringify(body),
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
};

export const apiPatch = async <RequestBody, ResponseType>(
  endpoint: string,
  body?: RequestBody,
  options: RequestInit = {},
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  const isFormData = body instanceof FormData;
  return apiRequest<ResponseType>(endpoint, {
    method: "PATCH",
    body: isFormData ? body : JSON.stringify(body),
    ...options,
    headers: {
      ...options.headers,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
};

export const apiDelete = async <ResponseType>(
  endpoint: string,
  options: RequestInit = {},
): Promise<StandardApiResponse<ResponseType> | ResponseType> => {
  return apiRequest<ResponseType>(endpoint, {
    method: "DELETE",
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  });
};
