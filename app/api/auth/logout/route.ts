import { jsonOk } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  const response = jsonOk({ message: "Logged out." });
  clearSessionCookie(response as NextResponse);
  return response;
}
