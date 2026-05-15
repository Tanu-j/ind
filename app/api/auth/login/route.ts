import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/auth";
import { User } from "@/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { email, password } = parsed.data;
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return jsonError("Invalid email or password.", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid email or password.", 401);
    }

    const response = jsonOk({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        credits: user.credits,
      },
    });

    await setSessionCookie(response as NextResponse, {
      userId: user._id.toString(),
      email: user.email,
    });

    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return jsonError("Login failed.", 500);
  }
}
