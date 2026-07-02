import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { setTokenCookie } from "@/lib/auth";
import * as authService from "@/services/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);

    const session = await authService.login(input.email, input.password);

    const response = NextResponse.json({ session });
    response.headers.set("Set-Cookie", setTokenCookie(session.token));
    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Invalid email or password" ||
        error.message === "Account is not active")
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}