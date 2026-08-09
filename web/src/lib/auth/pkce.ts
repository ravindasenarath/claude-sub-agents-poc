import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Random opaque `state` value for CSRF-protecting the OIDC redirect round trip. */
export function createState(): string {
  return randomBytes(16).toString("base64url");
}

/** PKCE `code_verifier` (RFC 7636 requires 43-128 chars; 32 random bytes base64url-encodes to 43). */
export function createCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** PKCE `code_challenge` for the `S256` method. */
export function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
