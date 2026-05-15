import { jsonOk } from "@/lib/api/response";
import { DEFAULT_API_SPLIT, INDEXING_MODES, DEFAULT_INDEXING_MODE } from "@/lib/constants";
import { isPlatformCredentialConfigured } from "@/lib/services/platform-credentials";

/** Public-safe runtime configuration for the dashboard UI. */
export async function GET() {
  const apiRatio = Number(process.env.HYBRID_API_RATIO ?? DEFAULT_API_SPLIT);
  const indexNowConfigured = Boolean(
    process.env.INDEXNOW_HOST && process.env.INDEXNOW_KEY
  );

  return jsonOk({
    apiRatio: Math.min(1, Math.max(0, apiRatio)),
    indexNowConfigured,
    maxUrlsPerBatch: 5000,
    indexingModes: INDEXING_MODES,
    defaultMode: DEFAULT_INDEXING_MODE,
    platformGoogleEnabled: isPlatformCredentialConfigured(),
    demoPurchasesEnabled: process.env.ALLOW_DEMO_CREDITS === "true",
  });
}
