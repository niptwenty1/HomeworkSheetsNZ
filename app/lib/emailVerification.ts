import { createHash, randomBytes } from "crypto";

export const EMAIL_VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createEmailVerificationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString(),
  };
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getEmailVerificationUrl(token: string) {
  const baseUrl = 
    process.env.BASE_URL ? `https://${process.env.BASE_URL}` : "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/api/verify-parent-email?token=${encodeURIComponent(token)}`;
}

export function buildEmailVerificationMessage({
  parentName,
  verificationUrl,
}: {
  parentName: string;
  verificationUrl: string;
}) {
  const safeParentName = escapeHtml(parentName);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#1a1a2e;padding:24px 28px;">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">HomeWorksheets</p>
      <p style="margin:4px 0 0;color:#aaaacc;font-size:13px;">Confirm your parent email address</p>
    </div>
    <div style="padding:24px 28px 20px;">
      <p style="font-size:15px;color:#333;">Kia ora <strong>${safeParentName}</strong>!</p>
      <p style="font-size:16px;line-height:1.6;color:#333;">Thank you for signing up. Please verify your email address so we can send your child their homework.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${verificationUrl}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">Verify my email address</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#666;">This verification link is valid for 7 days. If you did not sign up for HomeWorksheets, you can ignore this email.</p>
    </div>
    <div style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#aaa;">HomeWorksheets · Your child&apos;s learning, one day at a time</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}