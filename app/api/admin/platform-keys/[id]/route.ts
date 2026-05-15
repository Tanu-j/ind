import { z } from "zod";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getAdminUser } from "@/lib/auth/admin";
import { isValidObjectId } from "@/lib/validation/object-id";
import {
  deletePlatformKey,
  updatePlatformKey,
} from "@/lib/services/platform-keys-admin";

const patchSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return jsonUnauthorized("Admin access required.");

  const { id } = await params;
  if (!isValidObjectId(id)) return jsonError("Key not found.", 404);

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const key = await updatePlatformKey(id, parsed.data);
    if (!key) return jsonError("Key not found.", 404);
    return jsonOk({ key });
  } catch (err) {
    console.error("[admin/platform-keys PATCH]", err);
    return jsonError("Failed to update key.", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return jsonUnauthorized("Admin access required.");

  const { id } = await params;
  if (!isValidObjectId(id)) return jsonError("Key not found.", 404);

  try {
    const deleted = await deletePlatformKey(id);
    if (!deleted) return jsonError("Key not found.", 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("[admin/platform-keys DELETE]", err);
    return jsonError("Failed to delete key.", 500);
  }
}
