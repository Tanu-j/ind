import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validators/auth";
import { DEFAULT_CREDITS } from "@/lib/constants";
import { User } from "@/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const { name, email, password } = parsed.data;
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return jsonError("Email already registered.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      credits: DEFAULT_CREDITS,
    });

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
    console.error("[auth/register]", err);
    return jsonError("Registration failed.", 500);
  }
}
