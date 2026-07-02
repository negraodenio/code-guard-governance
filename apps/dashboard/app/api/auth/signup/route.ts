import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation";
import { setTokenCookie } from "@/lib/auth";
import * as authService from "@/services/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = signupSchema.parse(body);

    const session = await authService.signup(input);

    const response = NextResponse.json({ session }, { status: 201 });
    response.headers.set("Set-Cookie", setTokenCookie(session.token));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "A user with this email already exists") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}