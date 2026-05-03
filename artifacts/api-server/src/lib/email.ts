import nodemailer from "nodemailer";
import { logger } from "./logger";

// --- Config ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s/g, "");
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || "noreply@example.com";
const APP_URL = process.env.APP_URL || "https://crakadevelopers.online";

export const isEmailConfigured = () => !!(RESEND_API_KEY || (SMTP_HOST && SMTP_USER && SMTP_PASS));

function getAppUrl(): string {
  const d = process.env.REPLIT_DEV_DOMAIN;
  return d ? `https://24042-${d}` : APP_URL;
}

// --- Resend (HTTP, works on all cloud hosts) ---
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `CraKa OSINT <${FROM_EMAIL}>`, to, subject, html }),
    });
    const data = await res.json() as any;
    if (!res.ok) { logger.error({ status: res.status, err: data?.message, to }, "Resend FAILED"); return false; }
    logger.info({ id: data.id, to }, "Email sent via Resend");
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, to }, "Resend fetch error");
    return false;
  }
}

// --- SMTP fallback (works on Replit dev, may be blocked on some cloud hosts) ---
async function sendViaSMTP(to: string, subject: string, html: string): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) return false;
  const t = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false },
  });
  try {
    const info = await t.sendMail({ from: `CraKa OSINT <${FROM_EMAIL}>`, to, subject, html });
    logger.info({ messageId: info.messageId, to }, "Email sent via SMTP");
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, code: err.code, to }, "SMTP FAILED");
    return false;
  } finally {
    t.close();
  }
}

// --- Main send: Resend first, SMTP fallback ---
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (RESEND_API_KEY) {
    const ok = await sendViaResend(to, subject, html);
    if (ok) return true;
    logger.warn({ to }, "Resend failed, trying SMTP fallback...");
  }
  if (SMTP_USER && SMTP_PASS) {
    return sendViaSMTP(to, subject, html);
  }
  logger.warn("No email provider configured");
  return false;
}

export function verifySMTPOnStartup(): void {
  if (RESEND_API_KEY) {
    logger.info({ from: FROM_EMAIL }, "Email: Resend configured");
    return;
  }
  if (SMTP_USER && SMTP_PASS) {
    const t = nodemailer.createTransport({
      host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }, tls: { rejectUnauthorized: false },
    });
    (t as any).verify((err: Error | null) => {
      if (err) logger.error({ err: err.message }, "SMTP verify FAILED");
      else logger.info({ host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER }, "SMTP connected OK");
    });
  } else {
    logger.warn("No email provider — emails disabled");
  }
}

// --- Email templates ---
export async function sendMagicLink(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/auth/magic?token=${token}`;
  return sendEmail(email, "🔑 Your CraKa OSINT Login Link", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:8px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:13px;">India's #1 Intelligence Portal</p>
      <hr style="border-color:#1a2a3a;margin:20px 0;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to sign in. Expires in <strong style="color:#00d9ff;">15 minutes</strong>.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#00d9ff;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">SIGN IN TO CRAKA OSINT</a>
      <p style="color:#666;font-size:11px;">If you didn't request this, ignore this email. One-time use only.</p>
    </div>`);
}

export async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/verify-email?token=${token}`;
  return sendEmail(email, "✅ Verify your CraKa OSINT email", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:4px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:12px;margin:0 0 20px;">India's #1 Intelligence Portal</p>
      <hr style="border-color:#1a2a3a;margin:0 0 20px;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to verify your email:</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">✅ VERIFY EMAIL</a>
      <p style="color:#666;font-size:11px;">Expires in 24 hours. If you didn't register, ignore this email.</p>
    </div>`);
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string): Promise<boolean> {
  const link = `${getAppUrl()}/reset-password?token=${token}`;
  return sendEmail(email, "🔐 Reset your CraKa OSINT password", `
    <div style="font-family:monospace;background:#0a0a0a;color:#00d9ff;padding:32px;border-radius:12px;max-width:480px;margin:0 auto;border:1px solid #1a2a3a;">
      <h2 style="color:#00d9ff;margin-bottom:4px;">CraKa OSINT</h2>
      <p style="color:#aaa;font-size:12px;margin:0 0 20px;">Password Reset Request</p>
      <hr style="border-color:#1a2a3a;margin:0 0 20px;"/>
      <p style="color:#eee;">Hi ${name || "there"},</p>
      <p style="color:#aaa;">Click below to reset your password. Expires in <strong style="color:#00d9ff;">15 minutes</strong>.</p>
      <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#f59e0b;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">🔐 RESET PASSWORD</a>
      <p style="color:#666;font-size:11px;">If you didn't request this, ignore this email. Your password won't change.</p>
    </div>`);
}
