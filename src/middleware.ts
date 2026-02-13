import { NextRequest, NextResponse, userAgent } from "next/server";
import { decrypt } from "@/core/auth/crypto";

export default async function middleware(
  request: NextRequest
): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  const { device } = userAgent(request);
  const sessionCookie = request.cookies.get("session")?.value;
  const session = await decrypt(sessionCookie);

  // If NOT logged in
  if (!session?.user) {
    // If already on login page → allow access
    if (path === "/login") {
      return NextResponse.next();
    }
    // If on any other page → redirect to login with ?next=currentPath
    const authUrl = new URL("/login", request.nextUrl);
    authUrl.searchParams.set("next", path);
    return NextResponse.redirect(authUrl);
  }

  // If logged in AND trying to access login → redirect to home
  if (path === "/login") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Logged in and accessing protected routes → allow access
  const role = session.user.role;
  const response = NextResponse.next();
  response.headers.set("x-device-type", device.type || "desktop");
  response.headers.set("x-user-role", role);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|css|js|woff|woff2|ttf|eot|otf|json|map|wav)$).*)",
  ],
};
