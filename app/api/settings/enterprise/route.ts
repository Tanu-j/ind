import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models";

const patchSchema = z.object({
  sitemapPublicBaseUrl: z.union([z.string().url(), z.literal("")]).optional(),
  webhookUrl: z.union([z.string().url(), z.literal("")]).optional(),
  webhookSecret: z.union([z.string().max(512), z.literal("")]).optional(),
  processingPriority: z.number().int().min(0).max(100).optional(),
});

function normalizeOptionalUrl(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    await connectDB();
    const user = await User.findById(session.userId)
      .select("sitemapPublicBaseUrl webhookUrl webhookSecret processingPriority")
      .lean();

    if (!user) return jsonError("User not found.", 404);

    return jsonOk({
      sitemapPublicBaseUrl: user.sitemapPublicBaseUrl ?? "",
      webhookUrl: user.webhookUrl ?? "",
      hasWebhookSecret: Boolean(user.webhookSecret),
      processingPriority: user.processingPriority ?? 0,
    });
  } catch (err) {
    console.error("[settings/enterprise GET]", err);
    return jsonError("Failed to load settings.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) return jsonError("User not found.", 404);

    const p = parsed.data;
    if (p.sitemapPublicBaseUrl !== undefined) {
      user.sitemapPublicBaseUrl = normalizeOptionalUrl(p.sitemapPublicBaseUrl);
    }
    if (p.webhookUrl !== undefined) {
      user.webhookUrl = normalizeOptionalUrl(p.webhookUrl);
    }
    if (p.webhookSecret !== undefined) {
      const s = p.webhookSecret.trim();
      user.webhookSecret = s === "" ? undefined : s;
    }
    if (p.processingPriority !== undefined) {
      user.processingPriority = p.processingPriority;
    }

    await user.save();

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[settings/enterprise PATCH]", err);
    return jsonError("Failed to save.", 500);
  }
}
