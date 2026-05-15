import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import { jsonError, jsonOk, jsonUnauthorized } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getCreditPackage } from "@/lib/constants/credits";
import { User, CreditTransaction } from "@/models";

const purchaseSchema = z.object({
  packageId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return jsonUnauthorized();

    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
    }

    const pkg = getCreditPackage(parsed.data.packageId);
    if (!pkg) return jsonError("Unknown credit package.", 400);

    const isProd = process.env.NODE_ENV === "production";
    const demoAllowed = process.env.ALLOW_DEMO_CREDITS === "true";

    if (isProd && !demoAllowed) {
      return jsonError(
        "Online payments are not configured yet. Set ALLOW_DEMO_CREDITS=true for testing, or connect Stripe.",
        503
      );
    }

    await connectDB();
    const user = await User.findById(session.userId);
    if (!user) return jsonError("User not found.", 404);

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      user.credits += pkg.credits;
      await user.save({ session: dbSession });

      await CreditTransaction.create(
        [
          {
            userId: user._id,
            packageId: pkg.id,
            credits: pkg.credits,
            amountUsd: pkg.priceUsd,
            status: "completed",
          },
        ],
        { session: dbSession }
      );

      await dbSession.commitTransaction();

      return jsonOk({
        creditsAdded: pkg.credits,
        newBalance: user.credits,
        package: pkg.name,
      });
    } catch (err) {
      await dbSession.abortTransaction();
      throw err;
    } finally {
      dbSession.endSession();
    }
  } catch (err) {
    console.error("[credits/purchase]", err);
    return jsonError("Purchase failed.", 500);
  }
}
