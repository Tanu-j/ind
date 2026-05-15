import { z } from "zod";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { discoverSitemapUrlsForSite } from "@/lib/services/domain-discovery";

const querySchema = z.object({
  site: z.string().min(3),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ site: searchParams.get("site") ?? "" });
    if (!parsed.success) {
      return jsonError("Query ?site= is required (domain or URL).");
    }

    const urls = await discoverSitemapUrlsForSite(parsed.data.site);
    return jsonOk({ sitemaps: urls });
  } catch (err) {
    console.error("[domain/sitemaps]", err);
    return jsonError("Discovery failed.", 500);
  }
}
