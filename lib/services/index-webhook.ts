import { createHmac } from "node:crypto";

export async function sendIndexWebhook(
  user: { webhookUrl?: string | null; webhookSecret?: string | null },
  payload: Record<string, unknown>
): Promise<void> {
  const url = user.webhookUrl?.trim();
  if (!url) return;

  const body = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "WhiteIndexWay-Webhook/1.0",
  };

  const secret = user.webhookSecret?.trim();
  if (secret) {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-WhiteIndexWay-Signature"] = `sha256=${sig}`;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    /* best-effort */
  }
}
