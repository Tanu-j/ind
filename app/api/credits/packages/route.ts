import { jsonOk } from "@/lib/api/response";
import { CREDIT_PACKAGES } from "@/lib/constants/credits";
import { isPlatformCredentialConfigured } from "@/lib/services/platform-credentials";

export async function GET() {
  return jsonOk({
    packages: CREDIT_PACKAGES,
    platformGoogleEnabled: isPlatformCredentialConfigured(),
    demoPurchasesEnabled: process.env.ALLOW_DEMO_CREDITS === "true",
  });
}
