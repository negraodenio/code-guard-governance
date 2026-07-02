import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/onboarding", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("codeguard-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { jwtVerify } = await import("jose");
  const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-production"
  );

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const session = payload as unknown as {
      sub: string;
      org: string;
      email: string;
      role: string;
    };

    const response = NextResponse.next();
    response.headers.set("x-codeguard-user", session.sub);
    response.headers.set("x-codeguard-org", session.org);
    response.headers.set("x-codeguard-email", session.email);
    response.headers.set("x-codeguard-role", session.role);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};