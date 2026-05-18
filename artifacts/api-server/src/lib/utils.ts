import crypto from "crypto";

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(length: number = 24): string {
  return "sess_" + crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Generate a cryptographically secure referral code
 */
export function generateReferralCode(): string {
  const code = crypto.randomBytes(6).toString("base64url").slice(0, 6).toUpperCase();
  return `CRAKA-${code}`;
}
