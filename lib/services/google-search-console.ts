import { google } from "googleapis";

export interface GscInspectResult {
  success: boolean;
  data?: {
    indexStatus?: string;
    coverageState?: string;
    lastCrawlTime?: string;
    verdict?: string;
  };
  error?: string;
}

function createSearchConsoleClient(serviceAccountJson: string) {
  const credentials = JSON.parse(serviceAccountJson) as {
    client_email: string;
    private_key: string;
  };
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters"],
  });
  return google.searchconsole({ version: "v1", auth });
}

/** Inspect URL index status in Google Search Console (requires SA access to property). */
export async function inspectUrl(
  serviceAccountJson: string,
  siteUrl: string,
  inspectionUrl: string
): Promise<GscInspectResult> {
  try {
    const sc = createSearchConsoleClient(serviceAccountJson);
    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl: normalizeSiteUrl(siteUrl, inspectionUrl),
        languageCode: "en-US",
      },
    });

    const result = res.data.inspectionResult?.indexStatusResult;
    return {
      success: true,
      data: {
        indexStatus: result?.verdict ?? undefined,
        coverageState: result?.coverageState ?? undefined,
        lastCrawlTime: result?.lastCrawlTime ?? undefined,
        verdict: result?.verdict ?? undefined,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "GSC inspection failed.",
    };
  }
}

/** Submit sitemap URL to Search Console property. */
export async function submitSitemap(
  serviceAccountJson: string,
  siteUrl: string,
  sitemapUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sc = createSearchConsoleClient(serviceAccountJson);
    const site = normalizeSiteUrl(siteUrl, sitemapUrl);
    await sc.sitemaps.submit({
      siteUrl: site,
      feedpath: sitemapUrl,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Sitemap submit failed.",
    };
  }
}

function normalizeSiteUrl(siteUrl: string, sampleUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) return siteUrl;
  try {
    const u = new URL(sampleUrl);
    const base = siteUrl.replace(/\/$/, "");
    if (base.includes(u.hostname)) return base.endsWith("/") ? base : `${base}/`;
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  }
}
