import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@crakadevelopers.online";
const APP_URL = process.env.APP_URL || "https://crakadevelopers.online";

export const isEmailConfigured = () => !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

function createTransport() {
  if (!isEmailConfigured()) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendMagicLink(email: string, token: string, name?: string): Promise<boolean> {
  const transporter = createTransport();
  if (!transporter) {
    logger.warn("Email not configured — skipping magic link send");
    return false;
  }
  const link = `${APP_URL}/auth/magic?token=${token}`;
  try {
    await transporter.sendMail({
      from: `CraKa OSINT <${FROM_EMAIL}>`,
      to: email,
      subject: "🔑 Your CraKa OSINT Login Link",
      html: `
        <div style="font-family: monospace; background:#0a0a0a; color:#00d9ff; padding:32px; border-radius:12px; max-width:480px; margin:0 auto; border:1px solid #1a2a3a;">
          <h2 style="color:#00d9ff; margin-bottom:8px;">CraKa OSINT</h2>
          <p style="color:#aaa; font-size:13px;">India's #1 Intelligence Portal</p>
          <hr style="border-color:#1a2a3a; margin:20px 0;" />
          <p style="color:#eee;">Hi ${name || "there"},</p>
          <p style="color:#aaa;">Click the button below to sign in. This link expires in <strong style="color:#00d9ff;">15 minutes</strong>.</p>
          <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#00d9ff;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">
            SIGN IN TO CRAKA OSINT
          </a>
          <p style="color:#666; font-size:11px;">If you didn't request this, ignore this email. This link can only be used once.</p>
          <p style="color:#333; font-size:10px; margin-top:24px;">— @DM_CRAKA_OWNER_BOT</p>
        </div>
      `,
    });
    logger.info({ email }, "Magic link email sent");
    return true;
  } catch (err) {
    logger.error({ err, email }, "Failed to send magic link email");
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string, name?: string): Promise<boolean> {
  const transporter = createTransport();
  if (!transporter) {
    logger.warn("Email not configured — skipping verification email send");
    return false;
  }
  const link = `${APP_URL}/auth/verify-email?token=${token}`;
  try {
    await transporter.sendMail({
      from: `CraKa OSINT <${FROM_EMAIL}>`,
      to: email,
      subject: "✅ Verify your CraKa OSINT email",
      html: `
        <div style="font-family: monospace; background:#0a0a0a; color:#00d9ff; padding:32px; border-radius:12px; max-width:480px; margin:0 auto; border:1px solid #1a2a3a;">
          <h2 style="color:#00d9ff;">CraKa OSINT — Email Verification</h2>
          <hr style="border-color:#1a2a3a; margin:20px 0;" />
          <p style="color:#eee;">Hi ${name || "there"},</p>
          <p style="color:#aaa;">Please verify your email address by clicking below:</p>
          <a href="${link}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#22c55e;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:1px;">
            VERIFY EMAIL
          </a>
          <p style="color:#666; font-size:11px;">This link expires in 24 hours.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    logger.error({ err, email }, "Failed to send verification email");
    return false;
  }
}
