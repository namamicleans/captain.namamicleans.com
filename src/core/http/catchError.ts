import { HttpError } from "@core/http/errors";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";
import { createErrorResponse } from "@shared/response";

export async function catchError<T>(
  promise: Promise<T | StandardApiResponse<T>>,
): Promise<[ServerActionResponse<null> | null, T | StandardApiResponse<T> | null]> {
  try {
    const response = await promise;

    // All responses from backend are StandardApiResponse
    const standardResponse = response as StandardApiResponse<T>;
    if (standardResponse.success === false) {
      return [
        createErrorResponse(
          standardResponse.message,
          standardResponse.code,
          standardResponse.error,
        ),
        null,
      ];
    }

    return [null, response];
  } catch (error) {
    if (error instanceof HttpError) {
      return [
        createErrorResponse(
          error.message || "Request failed",
          `HTTP_${error.status}`,
          JSON.stringify({
            status: error.status,
            statusText: error.statusText,
            url: error.url,
          }),
        ),
        null,
      ];
    }

    if (error instanceof Error && error.message === "Request timed out") {
      return [
        createErrorResponse(
          "Request timed out. Please try again.",
          "TIMEOUT_ERROR",
          JSON.stringify({ originalError: error.message }),
        ),
        null,
      ];
    }

    throw error;
  }
}
