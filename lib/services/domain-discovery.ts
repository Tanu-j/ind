/**
 * Discover sitemap URLs from robots.txt and common paths (enterprise onboarding).
 */

const COMMON_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap-index.xml"];

function parseSitemapLines(robotsTxt: string): string[] {
  const out: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^#/i.test(trimmed) || !trimmed) continue;
    const m = /^sitemap:\s*(.+)$/i.exec(trimmed);
    if (m?.[1]) out.push(m[1].trim());
  }
  return out;
}

export async function discoverSitemapsFromRobots(origin: string): Promise<string[]> {
  try {
    const { origin: o } = new URL(origin.includes("://") ? origin : `https://${origin}`);
    const res = await fetch(`${o}/robots.txt`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSitemapLines(text);
  } catch {
    return [];
  }
}

export async function discoverCommonSitemapUrls(siteInput: string): Promise<string[]> {
  let origin: string;
  try {
    const u = new URL(siteInput.includes("://") ? siteInput : `https://${siteInput}`);
    origin = u.origin;
  } catch {
    return [];
  }

  const found: string[] = [];
  for (const p of COMMON_PATHS) {
    const candidate = `${origin}${p}`;
    try {
      const res = await fetch(candidate, { method: "GET", signal: AbortSignal.timeout(5000) });
      if (res.ok) found.push(candidate);
    } catch {
      /* skip */
    }
  }
  return found;
}

/** Aggregate robots + heuristic paths. */
export async function discoverSitemapUrlsForSite(siteInput: string): Promise<string[]> {
  const fromRobots = await discoverSitemapsFromRobots(siteInput);
  const fromCommon = await discoverCommonSitemapUrls(siteInput);
  const set = new Set<string>([...fromRobots, ...fromCommon]);
  return [...set];
}
