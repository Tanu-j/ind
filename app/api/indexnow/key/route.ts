/** Serves IndexNow verification key (rewritten from /{INDEXNOW_KEY}.txt in next.config). */
export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response("IndexNow not configured.", { status: 404 });
  }

  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
