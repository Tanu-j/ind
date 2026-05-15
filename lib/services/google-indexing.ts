import { google } from "googleapis";

export interface IndexingApiResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function publishUrlUpdate(
  serviceAccountJson: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<IndexingApiResult> {
  try {
    const credentials = JSON.parse(serviceAccountJson) as {
      client_email: string;
      private_key: string;
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    const indexing = google.indexing({ version: "v3", auth });
    const response = await indexing.urlNotifications.publish({
      requestBody: { url, type },
    });

    return { success: true, data: response.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing API request failed.";
    return { success: false, error: message };
  }
}

export function validateServiceAccountJson(json: string): {
  valid: boolean;
  clientEmail?: string;
  error?: string;
} {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return { valid: false, error: "Invalid service account JSON structure." };
    }
    return { valid: true, clientEmail: parsed.client_email };
  } catch {
    return { valid: false, error: "JSON parse failed." };
  }
}
