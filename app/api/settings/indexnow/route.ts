import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { UserIndexNow } from "@/models";

const schema = z.object({
  host: z.string().min(3).max(256),
  key: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9-]+$/, "Key must be alphanumeric (IndexNow spec)."),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const row = await UserIndexNow.findOne({ userId: session.userId }).lean();
    if (!row) return jsonOk({ configured: false });

    const host = row.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return jsonOk({
      configured: true,
      host: row.host,
      key: row.key,
      keyFileUrl: `https://${host}/${row.key}.txt`,
      isActive: row.isActive,
    });
  } catch (err) {
    console.error("[settings/indexnow GET]", err);
    return jsonError("Failed to load IndexNow settings.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    await connectDB();
    const host = parsed.data.host.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const row = await UserIndexNow.findOneAndUpdate(
      { userId: session.userId },
      {
        userId: session.userId,
        host,
        key: parsed.data.key,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return jsonOk({
      host: row.host,
      key: row.key,
      keyFileUrl: `https://${host}/${row.key}.txt`,
      instructions:
        "Host a text file at the key URL containing only your key, then submit URLs.",
    });
  } catch (err) {
    console.error("[settings/indexnow POST]", err);
    return jsonError("Failed to save IndexNow settings.", 500);
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    await UserIndexNow.deleteOne({ userId: session.userId });
    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("[settings/indexnow DELETE]", err);
    return jsonError("Failed to remove IndexNow settings.", 500);
  }
}
