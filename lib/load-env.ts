/**
 * Load .env / .env.local for standalone scripts (worker, seed).
 * Next.js loads these automatically; tsx does not.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function applyEnvFile(filePath: string, override: boolean) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    if (!override && process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

applyEnvFile(resolve(root, ".env"), false);
applyEnvFile(resolve(root, ".env.local"), true);
