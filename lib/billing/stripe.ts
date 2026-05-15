import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

export function stripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

/** Map package id → Stripe Price id (Dashboard → Products → Price). */
export function stripePriceIdForPackage(packageId: string): string | undefined {
  const envKey = `STRIPE_PRICE_${packageId.toUpperCase().replace(/-/g, "_")}`;
  const fromNamed = process.env[envKey]?.trim();
  if (fromNamed) return fromNamed;
  const mapRaw = process.env.STRIPE_PRICE_IDS_JSON?.trim();
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw) as Record<string, string>;
      const v = map[packageId];
      if (typeof v === "string" && v) return v;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export function isStripeCheckoutAvailable(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Webhook + checkout both set — production-grade billing. */
export function isStripeBillingComplete(): boolean {
  return isStripeCheckoutAvailable() && Boolean(stripeWebhookSecret());
}
