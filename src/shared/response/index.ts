import { ServerActionResponse } from "@/types/generic";

/**
 * Create error response for client-side validation errors
 * Use this ONLY for errors that occur before calling the backend
 */
export function createErrorResponse<T = null>(
  message: string,
  code: string = "ERROR",
  error: unknown = null
): ServerActionResponse<T> {
  // Convert error to string representation
  let errorString: string | null = null;
  if (error !== null && error !== undefined) {
    if (typeof error === "string") {
      errorString = error;
    } else if (typeof error === "object") {
      errorString = JSON.stringify(error);
    } else {
      errorString = JSON.stringify(error);
    }
  }

  return {
    success: false,
    message,
    code,
    data: null,
    error: errorString,
  };
}
