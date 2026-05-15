import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getCreditPackage } from "@/lib/constants/credits";
import { User, CreditTransaction } from "@/models";
import {
  getStripeClient,
  isStripeCheckoutAvailable,
  stripePriceIdForPackage,
} from "@/lib/billing/stripe";

const bodySchema = z.object({
  packageId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!isStripeCheckoutAvailable()) {
      return jsonError(
        "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for webhooks).",
        503
      );
    }

    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const stripe = getStripeClient();
    if (!stripe) return jsonError("Stripe client unavailable.", 503);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const pkg = getCreditPackage(parsed.data.packageId);
    if (!pkg) return jsonError("Unknown package.", 400);

    const priceId = stripePriceIdForPackage(pkg.id);
    if (!priceId) {
      return jsonError(
        `No Stripe price for package "${pkg.id}". Set STRIPE_PRICE_${pkg.id.toUpperCase()} or STRIPE_PRICE_IDS_JSON.`,
        503
      );
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) return jsonError("User not found.", 404);

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,
        success_url: `${appUrl}/dashboard/credits?paid=1`,
        cancel_url: `${appUrl}/dashboard/credits?canceled=1`,
        metadata: {
          userId: user._id.toString(),
          packageId: pkg.id,
        },
        line_items: [{ price: priceId, quantity: 1 }],
      },
      { idempotencyKey: `checkout-${user._id}-${pkg.id}` }
    );

    await CreditTransaction.create({
      userId: user._id,
      packageId: pkg.id,
      credits: pkg.credits,
      amountUsd: pkg.priceUsd,
      status: "pending",
      stripeCheckoutSessionId: checkoutSession.id,
    });

    if (!checkoutSession.url) {
      return jsonError("Stripe did not return a checkout URL.", 500);
    }

    return jsonOk({ url: checkoutSession.url });
  } catch (err) {
    console.error("[credits/checkout]", err);
    return jsonError("Checkout creation failed.", 500);
  }
}
