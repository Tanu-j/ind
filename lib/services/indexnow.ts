export interface IndexNowResult {
  success: boolean;
  status?: number;
  error?: string;
}

export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const host = process.env.INDEXNOW_HOST;
  const key = process.env.INDEXNOW_KEY;

  if (!host || !key) {
    return {
      success: false,
      error: "IndexNow not configured (INDEXNOW_HOST, INDEXNOW_KEY).",
    };
  }

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: host.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        key,
        keyLocation: `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${key}.txt`,
        urlList: urls.slice(0, 10000),
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true, status: response.status };
    }

    const text = await response.text();
    return { success: false, status: response.status, error: text || response.statusText };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "IndexNow request failed.",
    };
  }
}
