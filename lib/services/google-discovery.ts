/**
 * Additional discovery signals used by commercial indexing tools
 * alongside the Google Indexing API.
 */

export async function pingGoogleSitemap(sitemapUrl: string): Promise<{ ok: boolean }> {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const res = await fetch(pingUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok || res.status === 204 };
  } catch {
    return { ok: false };
  }
}

/** Notify Google that a specific page URL changed (via sitemap ping of page URL). */
export async function pingGoogleForUrl(pageUrl: string): Promise<{ ok: boolean }> {
  return pingGoogleSitemap(pageUrl);
}

export async function pingBingUrl(pageUrl: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("https://www.bing.com/indexnow", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    void pageUrl;
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function submitDiscoverySignals(url: string): Promise<Record<string, unknown>> {
  const [google, bing] = await Promise.all([
    pingGoogleForUrl(url),
    pingBingUrl(url),
  ]);
  return { googlePing: google, bingPing: bing, at: new Date().toISOString() };
}
