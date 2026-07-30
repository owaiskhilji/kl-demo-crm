import crypto from "crypto";

/**
 * AES-256-GCM encryption/decryption for sensitive tokens (e.g. integration_connections.access_token).
 * 
 * ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * 
 * Treat ENCRYPTION_KEY with the same care as SUPABASE_SERVICE_ROLE_KEY:
 * - Must be in .env.local AND Vercel Environment Variables
 * - Never commit to source control
 * - Losing it means all encrypted tokens become unrecoverable
 */

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "[Encryption] ENCRYPTION_KEY is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
      "and add it to .env.local and Vercel."
    );
  }

  if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error(
      "[Encryption] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
      `Got ${key.length} characters.`
    );
  }

  return Buffer.from(key, "hex");
}

/**
 * Encrypts a plaintext string. Returns format: iv:authTag:ciphertext (all hex).
 */
export function encrypt(text: string): string {
  const keyBuffer = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedText — all three parts needed for decryption
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string previously encrypted by encrypt().
 * Throws on invalid key, tampered data, or malformed input.
 */
export function decrypt(encryptedData: string): string {
  const keyBuffer = getEncryptionKey();

  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "[Encryption] Malformed encrypted data — expected iv:authTag:ciphertext format."
    );
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
