import { connectDB } from "@/lib/db/mongodb";
import { getStripeClient, stripeWebhookSecret } from "@/lib/billing/stripe";
import { getCreditPackage } from "@/lib/constants/credits";
import { User, CreditTransaction } from "@/models";
import mongoose from "mongoose";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  const stripe = getStripeClient();
  if (!secret || !stripe) {
    return new Response("Stripe not configured.", { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature.", { status: 400 });
  }

  const rawBody = await request.text();

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature", err);
    return new Response("Invalid signature.", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const sess = event.data.object as import("stripe").Stripe.Checkout.Session;
    const userId = sess.metadata?.userId;
    const packageId = sess.metadata?.packageId;
    const sessionId = sess.id;

    if (!userId || !packageId || !sessionId) {
      console.warn("[stripe/webhook] missing metadata", sess.id);
      return new Response("OK", { status: 200 });
    }

    const pkg = getCreditPackage(packageId);
    if (!pkg) {
      console.warn("[stripe/webhook] unknown package", packageId);
      return new Response("OK", { status: 200 });
    }

    await connectDB();
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
      const existing = await CreditTransaction.findOne({
        stripeCheckoutSessionId: sessionId,
        status: "completed",
      }).session(dbSession);
      if (existing) {
        await dbSession.commitTransaction();
        return new Response("OK", { status: 200 });
      }

      const pending = await CreditTransaction.findOne({
        stripeCheckoutSessionId: sessionId,
        status: "pending",
      }).session(dbSession);

      const user = await User.findById(userId).session(dbSession);
      if (!user) {
        await dbSession.abortTransaction();
        return new Response("OK", { status: 200 });
      }

      user.credits += pkg.credits;
      await user.save({ session: dbSession });

      if (pending) {
        pending.status = "completed";
        await pending.save({ session: dbSession });
      } else {
        await CreditTransaction.create(
          [
            {
              userId: user._id,
              packageId: pkg.id,
              credits: pkg.credits,
              amountUsd: pkg.priceUsd,
              status: "completed",
              stripeCheckoutSessionId: sessionId,
            },
          ],
          { session: dbSession }
        );
      }

      await dbSession.commitTransaction();
    } catch (err) {
      await dbSession.abortTransaction();
      console.error("[stripe/webhook] tx", err);
      return new Response("Error", { status: 500 });
    } finally {
      dbSession.endSession();
    }
  }

  return new Response("OK", { status: 200 });
}
