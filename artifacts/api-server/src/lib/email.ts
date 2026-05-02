import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@crakadevelopers.online";

export const isEmailConfigured = () => !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

function getAppUrl(): string {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) return `https://24042-${replitDomain}`;
  return process.env.APP_URL || "https://crakadevelopers.online";
}

// Singleton pooled transporter — reuses SMTP connections instead of reconnecting every time
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      pool: true,          // keep connections alive
      maxConnections: 5,   // up to 5 parallel connections
      maxMessages: 100,    // reuse connection for 100 messages
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transporter;
}

// Fire-and-forget wrapper — API responds instantly, email sends in background
function sendAsync(mailOptions: nodemailer.SendMailOptions): void {
  const transporter = getTransporter();
  if (!transporter) return;
  transporter.sendMail(mailOptions).catch((err) => {
    logger.error({ err, to: mailOptions.to }, "Email send failed");
  });
}

export async function sendMagicLink(email: string, token: string, name?: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn("Email not configured — skipping magic link");
    return false;
  }
  const link = `${getAppUrl()}/auth/magic?token=${token}`;
  sendAsync({
    from: `CraKa OSINT <${FROM_EMAIL}>`,
    to: email,
    subject: "🔑 Your CraKa OSINT Login Link",
    html: `
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
    `,
  });
  logger.info({ email }, "Magic link queued");
  return true;
}

export async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  sendAsync({
    from: `CraKa OSINT <${FROM_EMAIL}>`,
    to: email,
    subject: "✅ Verify your CraKa OSINT email",
    html: `
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
    `,
  });
  logger.info({ email }, "Verification email queued");
  return true;
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const link = `${getAppUrl()}/reset-password?token=${token}`;
  sendAsync({
    from: `CraKa OSINT <${FROM_EMAIL}>`,
    to: email,
    subject: "🔐 Reset your CraKa OSINT password",
    html: `
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
    `,
  });
  logger.info({ email }, "Password reset email queued");
  return true;
}
