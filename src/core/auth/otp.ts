"use server";

import { cookies } from "next/headers";
import { apiPost } from "@core/http/client";
import { catchError } from "@core/http/catchError";
import { encrypt } from "./crypto";
import { createErrorResponse } from "@shared/response";
import { ServerActionResponse, StandardApiResponse } from "@/types/generic";
import { UserResponse } from "@/types/auth";

export async function getOTP(
  phone_number: string,
): Promise<ServerActionResponse<unknown>> {
  const [error, response] = await catchError(
    apiPost<{ phone_number: string }, unknown>("/api/auth/send-otp/", { phone_number }),
  );

  if (error) {
    return createErrorResponse(error.message, error.code, error.error);
  }

  // Return backend response directly
  return response as StandardApiResponse<unknown>;
}

export async function verifyOTP(
  phone_number: string,
  otp: string,
): Promise<ServerActionResponse<UserResponse | null>> {
  const [error, response] = await catchError(
    apiPost<{ phone_number: string; otp: string }, UserResponse>("/api/auth/verify-otp/", {
      phone_number,
      otp,
    }),
  );

  if (error) {
    return createErrorResponse<UserResponse | null>(
      error.message,
      error.code,
      error.error,
    );
  }

  // All responses are StandardApiResponse
  const standardResponse = response as StandardApiResponse<UserResponse>;
  if (!standardResponse.success) {
    return standardResponse;
  }

  const data = standardResponse.data;

  const normalizedData = data
    ? {
        ...data,
        user: {
          ...data.user,
          role: data.user.role ? data.user.role.toLowerCase().trim() : data.user.role,
        },
      }
    : null;

  if (normalizedData) {
    const cookieStore = await cookies();
    const accessExpiry = Date.now() + 23 * 60 * 60 * 1000;
    const sessionValue = await encrypt(normalizedData, accessExpiry);
    const cookieExpiry = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);

    cookieStore.set({
      name: "session",
      value: sessionValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: cookieExpiry,
    });
  }

  return {
    success: true,
    message: "OTP verified successfully",
    code: "OTP_VERIFIED",
    data: normalizedData,
    error: null,
  };
}
