/**
 * Cross-engine discovery signals (IndexNow covers Bing/Yandex; no deprecated Google ping).
 */

export async function pingBingIndexNowUrl(
  pageUrl: string,
  config?: { host: string; key: string } | null
): Promise<{ ok: boolean }> {
  if (!config?.host || !config?.key) return { ok: false };
  try {
    const host = config.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const res = await fetch("https://www.bing.com/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: config.key,
        keyLocation: `https://${host}/${config.key}.txt`,
        urlList: [pageUrl],
      }),
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok || res.status === 202 };
  } catch {
    return { ok: false };
  }
}

export async function submitDiscoverySignals(
  url: string,
  indexNowConfig?: { host: string; key: string } | null
): Promise<Record<string, unknown>> {
  const bing = await pingBingIndexNowUrl(url, indexNowConfig);
  return {
    bingDirect: bing,
    note: "Google sitemap ping deprecated; use GSC sitemap submit job instead.",
    at: new Date().toISOString(),
  };
}
