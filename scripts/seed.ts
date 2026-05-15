/**
 * Seed default seed domains. Run: npm run seed
 */
import "../lib/load-env";
import { connectDB } from "../lib/db/mongodb";
import { SeedDomain } from "../models/SeedDomain";

async function seed() {
  await connectDB();

  const count = await SeedDomain.countDocuments();
  if (count > 0) {
    console.log(`[seed] ${count} seed domain(s) already exist. Skipping.`);
    process.exit(0);
  }

  const baseUrl = (
    process.env.SEED_DOMAIN_BASE_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  await SeedDomain.create({
    name: "WhiteIndexWay Discovery Hub",
    baseUrl,
    feedPath: "/feeds/live-index.xml",
    isActive: true,
  });

  console.log(`[seed] Default seed domain created (${baseUrl}/feeds/live-index.xml).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
