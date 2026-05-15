import { z } from "zod";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getAdminUser } from "@/lib/auth/admin";
import {
  createPlatformKey,
  listPlatformKeys,
} from "@/lib/services/platform-keys-admin";

const createSchema = z.object({
  label: z.string().min(1).max(100),
  serviceAccountJson: z.string().min(10),
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return jsonUnauthorized("Admin access required.");

  try {
    const data = await listPlatformKeys();
    return jsonOk(data);
  } catch (err) {
    console.error("[admin/platform-keys GET]", err);
    return jsonError("Failed to list platform keys.", 500);
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return jsonUnauthorized("Admin access required.");

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const key = await createPlatformKey(
      parsed.data.label,
      parsed.data.serviceAccountJson
    );
    return jsonOk({ key }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add key.";
    return jsonError(message, 400);
  }
}
