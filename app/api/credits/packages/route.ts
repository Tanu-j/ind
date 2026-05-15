import { jsonOk } from "@/lib/api/response";
import { CREDIT_PACKAGES } from "@/lib/constants/credits";
import { isPlatformCredentialConfigured } from "@/lib/services/platform-key-pool";
import { isStripeCheckoutAvailable } from "@/lib/billing/stripe";

export async function GET() {
  return jsonOk({
    packages: CREDIT_PACKAGES,
    platformGoogleEnabled: await isPlatformCredentialConfigured(),
    demoPurchasesEnabled: process.env.ALLOW_DEMO_CREDITS === "true",
    stripeCheckoutAvailable: isStripeCheckoutAvailable(),
  });
}
