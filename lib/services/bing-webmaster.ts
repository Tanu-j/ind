/**
 * Bing Webmaster URL submission (separate from IndexNow).
 * Requires API key + site verified in Bing Webmaster Tools.
 * @see https://www.bing.com/webmasters/url-submission-api
 */

export async function submitUrlToBingWebmaster(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const apiKey = process.env.BING_WEBMASTER_API_KEY?.trim();
  const siteUrlRaw = process.env.BING_WEBMASTER_SITE_URL?.trim();
  if (!apiKey || !siteUrlRaw) {
    return { success: true };
  }

  let siteUrl = siteUrlRaw;
  if (!siteUrl.endsWith("/")) siteUrl = `${siteUrl}/`;

  try {
    const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ siteUrl, url }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const t = await res.text();
      return { success: false, error: `Bing Webmaster ${res.status}: ${t.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bing Webmaster request failed.",
    };
  }
}
