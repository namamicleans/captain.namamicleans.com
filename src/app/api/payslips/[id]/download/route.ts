import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@core/auth/session";
import { refreshToken } from "@core/auth/sessionManager";
import { shouldRefreshToken } from "@core/auth/tokenHelpers";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "User not logged in. Please login to continue." },
      { status: 401 }
    );
  }

  if (shouldRefreshToken(session)) {
    const result = await refreshToken();
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message || "Session expired. Please login again." },
        { status: 401 }
      );
    }
    session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please login again." },
        { status: 401 }
      );
    }
  }

  const upstream = await fetch(
    `${SERVER_URL}/api/service/captain/payslips/${id}/download/`,
    { headers: { Authorization: `Bearer ${session.tokens.access}` } }
  );

  if (!upstream.ok) {
    const message =
      upstream.headers.get("content-type")?.includes("application/json")
        ? (await upstream.json()).message
        : "Failed to download payslip.";
    return NextResponse.json(
      { success: false, message: message || "Failed to download payslip." },
      { status: upstream.status }
    );
  }

  const pdfBytes = await upstream.arrayBuffer();
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ||
        `attachment; filename="payslip-${id}.pdf"`,
    },
  });
}
