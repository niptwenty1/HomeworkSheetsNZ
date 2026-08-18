import { NextResponse } from "next/server";
import { sendHomeworkEmail } from "../../lib/email";
import { sendTelegramMessage } from "../../lib/telegram";

type ContactPayload = {
  name?: unknown;
  studentName?: unknown;
  email?: unknown;
  message?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAdminRecipients() {
  const raw = [
    process.env.CONTACT_ADMIN_EMAILS,
    process.env.FROM_EMAIL,
  ]
    .filter(Boolean)
    .join(",");

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => emailPattern.test(value));
}

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const name = cleanText(payload.name);
  const studentName = cleanText(payload.studentName);
  const email = cleanText(payload.email);
  const message = cleanText(payload.message);

  if (!name || !studentName || !emailPattern.test(email) || message.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Please provide valid contact details and a message." },
      { status: 400 },
    );
  }

  if (message.length > 3000) {
    return NextResponse.json(
      { ok: false, error: "Message is too long. Please keep it under 3000 characters." },
      { status: 400 },
    );
  }

  const lines = [
    "HomeWorksheets contact request",
    `Name: ${name}`,
    `Student: ${studentName}`,
    `Email: ${email}`,
    "Message:",
    message,
    `Time (UTC): ${new Date().toISOString()}`,
  ];

  const recipients = getAdminRecipients();
  if (!recipients.length) {
    return NextResponse.json(
      { ok: false, error: "Admin email is not configured" },
      { status: 500 },
    );
  }

  const subject = `New contact request from ${name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#202020;">
      <h2 style="margin:0 0 12px;">HomeWorksheets contact request</h2>
      <p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:4px 0;"><strong>Student:</strong> ${escapeHtml(studentName)}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:4px 0;"><strong>Time (UTC):</strong> ${new Date().toISOString()}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />
      <p style="margin:0 0 8px;"><strong>Message</strong></p>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    for (const recipient of recipients) {
      const emailResult = await sendHomeworkEmail({
        to: recipient,
        subject,
        html,
        replyTo: email,
      });

      if (!emailResult.ok) {
        return NextResponse.json(
          { ok: false, error: "Failed to send admin email" },
          { status: 502 },
        );
      }
    }

    const telegramResult = await sendTelegramMessage({ text: lines.join("\n") });
    if (!telegramResult.ok) {
      const details = telegramResult.errors.join("; ") || "Telegram send failed";
      return NextResponse.json({ ok: false, error: details }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
