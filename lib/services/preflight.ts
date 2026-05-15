import { detectSchemaTypes } from "@/lib/services/schema-detect";

export interface PreflightResult {
  url: string;
  ok: boolean;
  statusCode?: number;
  fetchMs?: number;
  errors: string[];
  warnings: string[];
  schemaTypes: string[];
  googleApiEligible: boolean;
}

const SLOW_RESPONSE_MS = 2500;

function normalizeUrlForCompare(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    const path = x.pathname.replace(/\/$/, "") || "/";
    return `${x.protocol}//${x.host}${path === "/" ? "" : path}${x.search}`;
  } catch {
    return u;
  }
}

function extractCanonicalHref(html: string): string | null {
  const m = /<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(html);
  if (!m) return null;
  const tag = m[0];
  const hrefM = /href\s*=\s*["']([^"']+)["']/i.exec(tag);
  return hrefM?.[1]?.trim() ?? null;
}

export async function runPreflight(url: string): Promise<PreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let statusCode: number | undefined;
  let html = "";
  let finalUrl = url;
  let fetchMs: number | undefined;

  try {
    const t0 = Date.now();
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "WhiteIndexWay-Preflight/1.0" },
    });
    fetchMs = Date.now() - t0;
    finalUrl = res.url;
    statusCode = res.status;
    if (!res.ok) {
      errors.push(`HTTP ${res.status} — page must return 200.`);
    }
    if (fetchMs > SLOW_RESPONSE_MS) {
      warnings.push(
        `Slow response (${fetchMs} ms) — crawlers may time out; consider CDN or lighter pages.`
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      html = await res.text();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Could not fetch URL.");
  }

  if (html) {
    const canon = extractCanonicalHref(html);
    if (canon) {
      try {
        const abs = new URL(canon, finalUrl).href;
        if (normalizeUrlForCompare(abs) !== normalizeUrlForCompare(finalUrl)) {
          warnings.push(
            `Canonical points elsewhere (${abs}) — Google usually indexes the canonical target, not this URL.`
          );
        }
      } catch {
        warnings.push("Canonical href is present but could not be parsed.");
      }
    }
  }

  if (html) {
    if (/noindex/i.test(html) && /robots["']?\s*content/i.test(html)) {
      errors.push("Page has noindex — Google will not index.");
    }
    if (/<meta[^>]+robots[^>]+noindex/i.test(html)) {
      errors.push("Meta robots noindex detected.");
    }
  }

  const robotsBlocked = await checkRobotsTxt(url);
  if (robotsBlocked) {
    errors.push("Blocked by robots.txt for generic crawlers.");
  }

  const schemaTypes = html ? detectSchemaTypes(html) : [];
  const googleApiEligible =
    schemaTypes.includes("JobPosting") || schemaTypes.includes("BroadcastEvent");

  if (!googleApiEligible && html) {
    warnings.push(
      "No JobPosting/BroadcastEvent schema — Google Indexing API may still accept, crawl not guaranteed."
    );
  }

  return {
    url,
    ok: errors.length === 0,
    statusCode,
    fetchMs,
    errors,
    warnings,
    schemaTypes,
    googleApiEligible,
  };
}

export async function runPreflightBatch(urls: string[]): Promise<PreflightResult[]> {
  const concurrency = 8;
  const results: PreflightResult[] = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(runPreflight));
    results.push(...chunkResults);
  }
  return results;
}

async function checkRobotsTxt(pageUrl: string): Promise<boolean> {
  try {
    const { origin } = new URL(pageUrl);
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const text = await res.text();
    const path = new URL(pageUrl).pathname;
    return /User-agent:\s*\*/i.test(text) && /Disallow:\s*\/\s*$/im.test(text) && path !== "/";
  } catch {
    return false;
  }
}
