import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { isValidObjectId } from "@/lib/validation/object-id";
import { GcpCredential } from "@/models";

const patchCredentialSchema = z.object({
  isActive: z.boolean(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError("Credential not found.", 404);

    await connectDB();

    const result = await GcpCredential.findOneAndDelete({
      _id: id,
      userId: session.userId,
    });

    if (!result) return jsonError("Credential not found.", 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("[credentials DELETE]", err);
    return jsonError("Failed to delete credential.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError("Credential not found.", 404);

    const body = await request.json();
    const parsed = patchCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    await connectDB();

    const credential = await GcpCredential.findOneAndUpdate(
      { _id: id, userId: session.userId },
      { isActive: parsed.data.isActive },
      { new: true }
    ).select("-encryptedJson");

    if (!credential) return jsonError("Credential not found.", 404);
    return jsonOk({ credential });
  } catch (err) {
    console.error("[credentials PATCH]", err);
    return jsonError("Failed to update credential.", 500);
  }
}
