import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { encryptJson } from "@/lib/crypto/credentials";
import { validateServiceAccountJson } from "@/lib/services/google-indexing";
import { gcpCredentialSchema } from "@/lib/validators/indexing";
import { GcpCredential } from "@/models";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const credentials = await GcpCredential.find({ userId: session.userId })
      .select("-encryptedJson")
      .sort({ createdAt: -1 })
      .lean();

    return jsonOk({
      credentials: credentials.map((c) => ({
        id: c._id.toString(),
        label: c.label,
        propertyUrl: c.propertyUrl,
        clientEmail: c.clientEmail,
        isActive: c.isActive,
        dailyUsage: c.dailyUsage,
        dailyUsageResetAt: c.dailyUsageResetAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("[credentials GET]", err);
    return jsonError("Failed to fetch credentials.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const body = await request.json();
    const parsed = gcpCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const validation = validateServiceAccountJson(parsed.data.serviceAccountJson);
    if (!validation.valid) {
      return jsonError(validation.error ?? "Invalid service account.");
    }

    await connectDB();

    const credential = await GcpCredential.create({
      userId: session.userId,
      label: parsed.data.label,
      propertyUrl: parsed.data.propertyUrl,
      clientEmail: validation.clientEmail!,
      encryptedJson: encryptJson(parsed.data.serviceAccountJson),
      isActive: true,
    });

    return jsonOk({
      credential: {
        id: credential._id.toString(),
        label: credential.label,
        propertyUrl: credential.propertyUrl,
        clientEmail: credential.clientEmail,
      },
    }, 201);
  } catch (err) {
    console.error("[credentials POST]", err);
    return jsonError("Failed to save credential.", 500);
  }
}
