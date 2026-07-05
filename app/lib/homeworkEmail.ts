import { createHmac } from "crypto";

export type HomeworkEmailStudent = {
  name: string;
  email: string;
  level: string | number;
};

export type HomeworkEmailHomework = {
  mathsTopic?: string;
  mathsInstructions?: string;
  mathsWordProblem?: string;
  mathsQuestions?: Array<string | number>;
  readingTitle?: string;
  readingText?: string;
  readingQuestions?: Array<string | number>;
  writingType?: string;
  writingPrompt?: string;
  writingWordCount?: string;
  grammarTopic?: string;
  grammarInstruction?: string;
  grammarExercise?: string;
};

export type HomeworkEmailPayload = {
  student: HomeworkEmailStudent;
  hw: HomeworkEmailHomework;
  friendlyDate: string;
  completionBaseUrl?: string;
  signatureSecret?: string;
  date?: string;
  schoolName?: string;
  teacherName?: string;
};

export function buildHomeworkEmailPayload({
  student,
  hw,
  friendlyDate,
  completionBaseUrl = process.env.COMPLETION_WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  signatureSecret = process.env.COMPLETE_SECRET_KEY || "",
  date,
  schoolName = process.env.SCHOOL_NAME || "HomeWorksheets",
  teacherName = process.env.TEACHER_NAME || "Teacher",
}: HomeworkEmailPayload) {
  const today = date || new Date().toISOString().slice(0, 10);
  const subject = `Year ${student.level} Homework — ${friendlyDate}`;

  const mathsQuestions = (hw.mathsQuestions || [])
    .map((q, i) => `
      <tr>
        <td style="padding:5px 0;color:#555;font-size:13px;vertical-align:top;">${i + 1}.</td>
        <td style="padding:5px 8px;font-size:14px;">${escapeHtml(String(q))}</td>
      </tr>`)
    .join("");

  const readingQuestions = (hw.readingQuestions || [])
    .map((q, i) => `
      <tr>
        <td style="padding:5px 0;color:#555;font-size:13px;vertical-align:top;">${i + 1}.</td>
        <td style="padding:5px 8px;font-size:14px;">${escapeHtml(String(q))}</td>
      </tr>`)
    .join("");

  const signature = generateCompletionSignature({
    email: student.email,
    name: student.name,
    date: today,
    secret: signatureSecret,
  });

  const completionLink = `${completionBaseUrl}?email=${encodeURIComponent(student.email)}&name=${encodeURIComponent(student.name)}&sig=${encodeURIComponent(signature)}&date=${encodeURIComponent(today)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:#1a1a2e;padding:24px 28px;">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">${escapeHtml(schoolName)}</p>
      <p style="margin:4px 0 0;color:#aaaacc;font-size:13px;">Year ${escapeHtml(String(student.level))} Daily Homework — ${escapeHtml(friendlyDate)}</p>
    </div>
    <div style="padding:24px 28px 8px;">
      <p style="font-size:15px;color:#333;">Kia ora <strong>${escapeHtml(student.name)}</strong>!</p>
      <div style="font-size:16px;line-height:1.6;color:#333;">
        <p>Here’s your homework for today.</p>
        <p>Try your best and complete as much as you can. Take your time, do your neatest work on paper, and most importantly, give it a good try.</p>
      </div>
    </div>

    <div style="margin:0 28px 20px;background:#EBF3FF;border-radius:8px;padding:18px 20px;">
      <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#0C447C;">Maths</p>
      <p style="margin:0 0 12px;font-size:13px;color:#185FA5;">Topic: ${escapeHtml(hw.mathsTopic || "")}</p>
      <p style="margin:0 0 10px;font-size:14px;color:#333;">${escapeHtml(hw.mathsInstructions || "")}</p>
      <table style="width:100%;border-collapse:collapse;">${mathsQuestions}</table>
      <div style="margin-top:14px;background:#fff;border-radius:6px;padding:12px 14px;border-left:3px solid #378ADD;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#185FA5;text-transform:uppercase;">Word Problem</p>
        <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${escapeHtml(hw.mathsWordProblem || "")}</p>
      </div>
    </div>

    <div style="margin:0 28px 20px;background:#F0F7EC;border-radius:8px;padding:18px 20px;">
      <p style="margin:0 0 14px;font-size:16px;font-weight:bold;color:#27500A;">English</p>
      <div style="background:#fff;border-radius:6px;padding:14px 16px;margin-bottom:12px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#333;">${escapeHtml(hw.readingTitle || "")}</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.7;">${escapeHtml(hw.readingText || "")}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">${readingQuestions}</table>
      <div style="margin-top:16px;background:#fff;border-radius:6px;padding:12px 14px;border-left:3px solid #639922;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#3B6D11;text-transform:uppercase;letter-spacing:.05em;">Writing — ${escapeHtml(hw.writingType || "")}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#333;line-height:1.6;">${escapeHtml(hw.writingPrompt || "")}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#639922;">Aim for ${escapeHtml(hw.writingWordCount || "")}</p>
      </div>
      <div style="margin-top:12px;background:#fff;border-radius:6px;padding:12px 14px;border-left:3px solid #97C459;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#3B6D11;text-transform:uppercase;letter-spacing:.05em;">Grammar — ${escapeHtml(hw.grammarTopic || "")}</p>
        <p style="margin:4px 0 6px;font-size:14px;color:#333;">${escapeHtml(hw.grammarInstruction || "")}</p>
        <p style="margin:0;font-size:14px;color:#444;line-height:1.6;font-style:italic;">${escapeHtml(hw.grammarExercise || "")}</p>
      </div>
    </div>

    <div style="padding:8px 28px 24px;text-align:center;">
      <p style="font-size:14px;color:#333;margin-bottom:14px;">Finished your homework?</p>
      <a href="${completionLink}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">I've Finished Today's Homework</a>
      <p style="font-size:11px;color:#888;margin-top:10px;">Click this after giving today's homework a good try.</p>
    </div>

    <div style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 28px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#aaa;">Year ${escapeHtml(String(student.level))} · ${escapeHtml(schoolName)} · Sent by ${escapeHtml(teacherName)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    html,
    completionLink,
    signature,
  };
}

export function generateCompletionSignature({
  email,
  name,
  date,
  secret,
}: {
  email: string;
  name: string;
  date: string;
  secret: string;
}) {
  const msg = `${email}|${date}|${name}`;
  const expected = createHmac("sha256", secret).update(msg).digest("base64");
  return expected;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
