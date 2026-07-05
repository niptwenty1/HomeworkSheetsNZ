import { NextResponse } from "next/server";
import { getStudentsMarkedForResend, getStudentByEmail, getSupabaseHomeworkForDate, clearResendFlagById, logSentEmail } from "../../../lib/supabaseHomeworkData";
import { buildHomeworkEmailPayload } from "../../../lib/homeworkEmail";
import sendHomeworkEmail from "../../../lib/email";

function verifySecretHeader(headerValue: string | null, secret: string) {
  if (!headerValue) return false;
  try {
    return headerValue === secret;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");

  if (!cronSecret || !verifySecretHeader(headerSecret, cronSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const pending = await getStudentsMarkedForResend();
  const results: Array<{ id?: number; email: string; status: string }> = [];

  for (const req of pending) {
    try {
      const student = await getStudentByEmail(String(req.email || ""));
      if (!student) {
        await clearResendFlagById(Number(req.id));
        results.push({ id: Number(req.id), email: String(req.email || ""), status: "student-not-found" });
        continue;
      }

      const date = req.resend_date || null;
      const homeworkRows = date ? await getSupabaseHomeworkForDate(String(date)) : [];
      const homework = homeworkRows.find((h) => String(h.year_level) === String(student.year_level));
      if (!homework) {
        await clearResendFlagById(Number(req.id));
        results.push({ id: Number(req.id), email: String(req.email || ""), status: "homework-not-found" });
        continue;
      }

      const friendlyDate = date
        ? new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`))
        : new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

      const payload = buildHomeworkEmailPayload({
        student: { name: student.child_name, email: student.email, level: student.year_level },
        hw: {
          mathsTopic: String(homework.maths_topic || ""),
          mathsInstructions: String(homework.maths_instructions || ""),
          mathsWordProblem: String(homework.maths_word_problem || ""),
          mathsQuestions: Array.isArray(homework.maths_questions) ? (homework.maths_questions as Array<unknown>).map((i) => String(i)) : [],
          readingTitle: String(homework.reading_title || ""),
          readingText: String(homework.reading_text || ""),
          readingQuestions: Array.isArray(homework.reading_questions) ? (homework.reading_questions as Array<unknown>).map((i) => String(i)) : [],
          writingType: String(homework.writing_type || ""),
          writingPrompt: String(homework.writing_prompt || ""),
          writingWordCount: String(homework.writing_word_count || ""),
          grammarTopic: String(homework.grammar_topic || ""),
          grammarInstruction: String(homework.grammar_instruction || ""),
          grammarExercise: String(homework.grammar_exercise || ""),
        },
        friendlyDate,
        date: String(date || new Date().toISOString().slice(0, 10)),
      });

      const sendResult = await sendHomeworkEmail({ to: student.email, subject: payload.subject, html: payload.html, from: process.env.FROM_EMAIL, replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL });

      await logSentEmail({ email: student.email, name: student.child_name, year: student.year_level, date: String(req.resend_date || ""), status: sendResult.ok ? "sent" : "failed", providerResponse: sendResult.body });

      await clearResendFlagById(Number(req.id));
      results.push({ id: Number(req.id), email: String(req.email || ""), status: sendResult.ok ? "sent" : "failed" });
    } catch (error: unknown) {
      await clearResendFlagById(Number(req.id));
      results.push({ id: Number(req.id), email: String(req.email || ""), status: "error" });
      console.error("Failed to process resend request", error);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
