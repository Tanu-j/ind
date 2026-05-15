import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) return jsonUnauthorized();

    return jsonOk({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        credits: user.credits,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("[auth/me]", err);
    return jsonError("Failed to fetch user.", 500);
  }
}
