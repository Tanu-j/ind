import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY or AUTH_SECRET (32+ chars) required.");
  }
  return scryptSync(secret, "whiteindexway-salt", 32);
}

export function encryptJson(plainText: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptJson(encrypted: string): string {
  const [ivHex, authTagHex, dataHex] = encrypted.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Invalid encrypted credential format.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
