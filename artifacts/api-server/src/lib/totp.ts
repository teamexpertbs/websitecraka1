import speakeasy from "speakeasy";
import QRCode from "qrcode";

export function generateTotpSecret(label: string) {
  const secret = speakeasy.generateSecret({
    name: `CraKa OSINT Admin (${label})`,
    issuer: "CraKa OSINT",
    length: 20,
  });
  return secret;
}

export function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}
