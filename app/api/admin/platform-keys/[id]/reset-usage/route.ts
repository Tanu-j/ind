import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getAdminUser } from "@/lib/auth/admin";
import { isValidObjectId } from "@/lib/validation/object-id";
import { resetPlatformKeyUsage } from "@/lib/services/platform-keys-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return jsonUnauthorized("Admin access required.");

  const { id } = await params;
  if (!isValidObjectId(id)) return jsonError("Key not found.", 404);

  try {
    const key = await resetPlatformKeyUsage(id);
    if (!key) return jsonError("Key not found.", 404);
    return jsonOk({ key });
  } catch (err) {
    console.error("[admin/platform-keys reset-usage]", err);
    return jsonError("Failed to reset usage.", 500);
  }
}
