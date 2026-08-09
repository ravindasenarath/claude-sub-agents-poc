import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

/** Derives a fixed-length AES-256 key from an arbitrary-length secret string. */
function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an arbitrary JSON-serializable payload into an opaque,
 * tamper-evident string suitable for storing in a cookie (AES-256-GCM: the
 * auth tag makes any modification of the ciphertext detectable on decrypt).
 * Used for both the session cookie (`session.ts`) and the short-lived
 * pre-auth cookie (`pending-auth.ts`).
 */
export function encryptJson(payload: unknown, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64url")).join(".");
}

/**
 * Decrypts a value produced by {@link encryptJson}. Returns `null` (rather
 * than throwing) for anything malformed, tampered with, or encrypted under a
 * different secret, so callers can treat "no valid session" uniformly.
 */
export function decryptJson<T>(token: string, secret: string): T | null {
  try {
    const [ivPart, tagPart, ciphertextPart] = token.split(".");
    if (!ivPart || !tagPart || !ciphertextPart) return null;

    const key = deriveKey(secret);
    const iv = Buffer.from(ivPart, "base64url");
    const authTag = Buffer.from(tagPart, "base64url");
    const ciphertext = Buffer.from(ciphertextPart, "base64url");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}
