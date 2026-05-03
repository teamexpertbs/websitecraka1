import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

export const isEmailConfigured = () => !!RESEND_API_KEY;

function getAppUrl(): string {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) return `https://24042-${replitDomain}`;
  return process.env.APP_URL || "https://crakadevelopers.online";
}

// Verify email config on startup
export function verifySMTPOnStartup(): void {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set — emails disabled");
  } else {
    logger.info({ from: FROM_EMAIL }, "Resend email configured OK");
  }
}

// Send email via Resend HTTP API
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn("No RESEND_API_KEY — email skipped");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `CraKa OSINT <${FROM_EMAIL}>`, to, subject, html }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      logger.error({ status: res.status, error: data, to, subject }, "Resend API error");
      return false;
    }
    logger.info({ id: data.id, to, subject }, "Email delivered via Resend");
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, to, subject }, "Resend fetch failed");
    return false;
  }
}

export async function sendMagicLink(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/auth/magic?token=${token}`;
  return sendEmail(email, "🔑 Your CraKa OSINT Login Link", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:8px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:13px;">India's #1 Intelligence Portal</p>
      <hr style="border-color:#1a2a3a;margin:20px 0;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to sign in. Expires in <strong style="color:#00d9ff;">15 minutes</strong>.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#00d9ff;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">
        SIGN IN TO CRAKA OSINT
      </a>
      <p style="color:#666;font-size:11px;">If you didn't request this, ignore this email. One-time use only.</p>
    </div>
  `);
}

export async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  return sendEmail(email, "✅ Verify your CraKa OSINT email", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:4px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:12px;margin:0 0 20px;">India's #1 Intelligence Portal</p>
      <hr style="border-color:#1a2a3a;margin:0 0 20px;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to verify your email and activate your account:</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">
        ✅ VERIFY EMAIL
      </a>
      <p style="color:#666;font-size:11px;">Expires in 24 hours. If you didn't register, ignore this email.</p>
    </div>
  `);
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/reset-password?token=${token}`;
  return sendEmail(email, "🔐 Reset your CraKa OSINT password", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:4px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:12px;margin:0 0 20px;">Password Reset Request</p>
      <hr style="border-color:#1a2a3a;margin:0 0 20px;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to set a new password. Expires in <strong style="color:#00d9ff;">15 minutes</strong>.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#f59e0b;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">
        🔐 RESET PASSWORD
      </a>
      <p style="color:#666;font-size:11px;">If you didn't request this, ignore this email. Your password won't change.</p>
    </div>
  `);
}
