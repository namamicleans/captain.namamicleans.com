"use server";

import { apiGet, apiPost, fetchWithSession } from "@core/http";
import { createErrorResponse } from "@shared/response";
import type { ServerActionResponse } from "@/types/generic";

export async function getVapidPublicKey(): Promise<
  ServerActionResponse<{ public_key: string }>
> {
  try {
    const response = await apiGet<{ public_key: string }>(
      "/api/messaging/push/vapid-public-key/"
    );
    if ("data" in response && response.data) {
      return {
        success: true,
        message: "Fetched",
        code: "SUCCESS",
        data: response.data,
        error: null,
      };
    }
    return createErrorResponse("Failed to fetch VAPID key", "ERROR", null);
  } catch (error) {
    return createErrorResponse("Failed to fetch VAPID key", "ERROR", error);
  }
}

type SubscribePayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(
  payload: SubscribePayload
): Promise<ServerActionResponse<{ id: number; status: string }>> {
  const result = await fetchWithSession<
    SubscribePayload,
    { id: number; status: string }
  >(apiPost, "/api/messaging/push/subscribe/", payload);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      message: result.message,
      code: result.code,
      data: null,
      error: result.error,
    } as ServerActionResponse<{ id: number; status: string }>;
  }

  return result as ServerActionResponse<{ id: number; status: string }>;
}
