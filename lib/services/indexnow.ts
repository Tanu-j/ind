export interface IndexNowConfig {
  host: string;
  key: string;
  keyLocation?: string;
}

export interface IndexNowResult {
  success: boolean;
  status?: number;
  error?: string;
  engine?: string;
}

function normalizeHost(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export async function submitToIndexNow(
  urls: string[],
  config?: IndexNowConfig | null
): Promise<IndexNowResult> {
  const host = config?.host ?? process.env.INDEXNOW_HOST;
  const key = config?.key ?? process.env.INDEXNOW_KEY;

  if (!host || !key) {
    return {
      success: false,
      error: "IndexNow not configured. Add your domain key in Settings.",
    };
  }

  const normalizedHost = normalizeHost(host);
  const keyLocation =
    config?.keyLocation ??
    `https://${normalizedHost}/${key}.txt`;

  const payload = {
    host: normalizedHost,
    key,
    keyLocation,
    urlList: urls.slice(0, 10000),
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
  ];

  let lastError = "";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok || response.status === 202) {
        return { success: true, status: response.status, engine: endpoint };
      }
      lastError = await response.text();
    } catch (err) {
      lastError = err instanceof Error ? err.message : "IndexNow failed";
    }
  }

  return { success: false, error: lastError || "All IndexNow endpoints failed." };
}
