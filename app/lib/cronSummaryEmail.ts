import { sendHomeworkEmail } from "./email";

type CronSummaryKind = "send-homework" | "generate-weekly-worker";

export type CronSummaryEmailInput = {
  kind: CronSummaryKind;
  targetDate: string;
  dayName?: string;
  status: string;
  counts?: {
    total?: number;
    sent?: number;
    failed?: number;
    skipped?: number;
    generated?: number;
  };
  details?: string[];
  yearLevel?: string;
  referenceDate?: string;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSummarySubject(input: CronSummaryEmailInput) {
  if (input.kind === "send-homework") {
    return `[HomeWorksheets] Homework send summary - ${input.targetDate}`;
  }

  return `[HomeWorksheets] Homework generation ${input.status} - Year ${input.yearLevel || "?"} - ${input.referenceDate || input.targetDate}`;
}

function buildSummaryHtml(input: CronSummaryEmailInput) {
  const counts = input.counts || {};
  const rows = [
    ["Status", input.status],
    ["Date", input.targetDate],
    ["Day", input.dayName || ""],
    ["Total", counts.total ?? ""],
    ["Sent", counts.sent ?? ""],
    ["Failed", counts.failed ?? ""],
    ["Skipped", counts.skipped ?? ""],
    ["Generated", counts.generated ?? ""],
    ["Year level", input.yearLevel || ""],
    ["Reference date", input.referenceDate || ""],
  ].filter(([, value]) => value !== "" && value !== null && value !== undefined);

  const details = (input.details || []).filter(Boolean);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,sans-serif;color:#1f2937;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;background:#111827;color:#fff;">
      <div style="font-size:18px;font-weight:700;">HomeWorksheets cron summary</div>
      <div style="margin-top:6px;font-size:13px;color:#cbd5e1;">${escapeHtml(buildSummarySubject(input))}</div>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #eef2f7;font-weight:700;width:180px;vertical-align:top;">${escapeHtml(label)}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #eef2f7;">${escapeHtml(value)}</td>
                </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      ${
        details.length > 0
          ? `
            <div style="margin-top:20px;">
              <div style="font-size:14px;font-weight:700;margin-bottom:10px;">Details</div>
              <ul style="margin:0;padding-left:20px;color:#374151;">
                ${details.map((detail) => `<li style="margin:0 0 6px;">${escapeHtml(detail)}</li>`).join("")}
              </ul>
            </div>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;
}

export async function sendCronSummaryEmail(input: CronSummaryEmailInput) {
  const to = process.env.FROM_EMAIL;
  if (!to) {
    console.info("[cron-summary] skipped: FROM_EMAIL is not configured", {
      kind: input.kind,
      status: input.status,
    });
    return;
  }

  const subject = buildSummarySubject(input);
  const html = buildSummaryHtml(input);

  try {
    await sendHomeworkEmail({
      to,
      subject,
      html,
      from: process.env.FROM_EMAIL,
      replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron-summary] failed to send summary email", {
      kind: input.kind,
      status: input.status,
      error: message,
    });
  }
}