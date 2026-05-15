import { connectDB } from "@/lib/db/mongodb";
import { buildUrlSetXml, getBatchSitemapUrls } from "@/lib/services/batch-sitemap";
import { isValidObjectId } from "@/lib/validation/object-id";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return new Response("Not found", { status: 404 });
  }

  await connectDB();
  const urls = await getBatchSitemapUrls(id);
  const xml = buildUrlSetXml(urls);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
