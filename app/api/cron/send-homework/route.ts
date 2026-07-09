import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { buildHomeworkEmailPayload } from "../../../lib/homeworkEmail";
import { getSupabaseHomeworkForDate, getSupabaseStudents, logSentEmail } from "../../../lib/supabaseHomeworkData";
import { sendHomeworkEmail } from "../../../lib/email";

function verifySecretHeader(headerValue: string | null, secret: string) {
  if (!headerValue) return false;
  const headerBuffer = Buffer.from(headerValue, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");
  if (headerBuffer.length !== secretBuffer.length) return false;

  try {
    const headerHash = createHash("sha256").update(headerBuffer).digest("hex");
    const secretHash = createHash("sha256").update(secretBuffer).digest("hex");
    return headerHash === secretHash;
  } catch {
    return false;
  }
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDayName(date: Date) {
  return date.toLocaleDateString("en-NZ", { weekday: "long" });
}

function getFriendlyDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseStudentDays(days: string | null | undefined) {
  if (!days) return [];
  return String(days)
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);
}

function isHomeworkDay(dayName: string) {
  return dayName === "Monday" || dayName === "Wednesday" || dayName === "Friday";
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const vercelCronSchedule = request.headers.get("x-vercel-cron-schedule");
  const userAgent = request.headers.get("user-agent") || "";

  if (vercelCronHeader === "1" || Boolean(vercelCronSchedule) || userAgent.includes("vercel-cron/1.0")) {
    return true;
  }

  return Boolean(cronSecret && verifySecretHeader(headerSecret, cronSecret));
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const queryDate = url.searchParams.get("date")?.trim();
  const body = request.method === "GET" ? {} : ((await request.json().catch(() => ({}))) as Record<string, unknown>);
  const requestedDate =
    queryDate || (typeof body.date === "string" && body.date ? body.date : getDateString(new Date()));
  const targetDate = requestedDate;
  const dayName = getDayName(new Date(`${targetDate}T12:00:00`));
  const friendlyDate = getFriendlyDate(targetDate);

  console.info("[cron/send-homework] start", {
    method: request.method,
    targetDate,
    dayName,
  });

  if (!isHomeworkDay(dayName)) {
    console.info("[cron/send-homework] skipped", {
      targetDate,
      dayName,
      reason: "No homework is scheduled on this day",
    });

    return NextResponse.json({
      ok: true,
      skipped: true,
      date: targetDate,
      day: dayName,
      reason: "No homework is scheduled on this day",
      count: 0,
      sends: [],
    });
  }

  const [students, homeworkRows] = await Promise.all([
    getSupabaseStudents(),
    getSupabaseHomeworkForDate(targetDate),
  ]);

  if (homeworkRows.length === 0) {
    console.info("[cron/send-homework] skipped", {
      targetDate,
      dayName,
      reason: "No homework entries were found for the requested date",
    });

    return NextResponse.json({
      ok: true,
      skipped: true,
      date: targetDate,
      day: dayName,
      reason: "No homework entries were found for the requested date",
      count: 0,
      sends: [],
    });
  }

  const homeworkByYearLevel = new Map(
    homeworkRows.map((row) => [String(row.year_level), row]),
  );

  const preparedSends = [] as Array<{
    studentName: string;
    email: string;
    subject: string;
    status?: string;
    providerResponse?: unknown;
  }>;

  for (const student of students) {
    const studentDays = parseStudentDays(student.days);
    if (studentDays.length > 0 && !studentDays.includes(dayName)) {
      continue;
    }

    const homework = homeworkByYearLevel.get(String(student.level));
    if (!homework) {
      continue;
    }

    const payload = buildHomeworkEmailPayload({
      student: {
        name: String(student.name || ""),
        email: String(student.email || ""),
        level: String(student.level || ""),
      },
      hw: {
        mathsTopic: String(homework.maths_topic || ""),
        mathsInstructions: String(homework.maths_instructions || ""),
        mathsWordProblem: String(homework.maths_word_problem || ""),
        mathsQuestions: Array.isArray(homework.maths_questions)
          ? (homework.maths_questions as Array<unknown>).map((item) => String(item))
          : [],
        readingTitle: String(homework.reading_title || ""),
        readingText: String(homework.reading_text || ""),
        readingQuestions: Array.isArray(homework.reading_questions)
          ? (homework.reading_questions as Array<unknown>).map((item) => String(item))
          : [],
        writingType: String(homework.writing_type || ""),
        writingPrompt: String(homework.writing_prompt || ""),
        writingWordCount: String(homework.writing_word_count || ""),
        grammarTopic: String(homework.grammar_topic || ""),
        grammarInstruction: String(homework.grammar_instruction || ""),
        grammarExercise: String(homework.grammar_exercise || ""),
      },
      friendlyDate,
      date: targetDate,
    });

    // send via configured mail provider
    try {
      const sendResult = await sendHomeworkEmail({
        to: String(student.email || ""),
        subject: payload.subject,
        html: payload.html,
        from: process.env.FROM_EMAIL,
        replyTo: process.env.REPLY_TO_EMAIL || process.env.FROM_EMAIL,
      });

      const status = sendResult.ok ? "sent" : "failed";
      await logSentEmail({
        email: String(student.email || ""),
        name: String(student.name || ""),
        year: String(student.level || ""),
        date: targetDate,
        status,
        providerResponse: sendResult.body,
      });

      if (sendResult.ok) {
        preparedSends.push({
          studentName: String(student.name || ""),
          email: String(student.email || ""),
          subject: payload.subject,
        });
      } else {
        preparedSends.push({
          studentName: String(student.name || ""),
          email: String(student.email || ""),
          subject: payload.subject,
          status: "failed",
          providerResponse: sendResult.body,
        });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      await logSentEmail({
        email: String(student.email || ""),
        name: String(student.name || ""),
        year: String(student.level || ""),
        date: targetDate,
        status: "error",
        providerResponse: { message: errorMessage },
      });
      preparedSends.push({
        studentName: String(student.name || ""),
        email: String(student.email || ""),
        subject: payload.subject,
        status: "error",
        providerResponse: { message: errorMessage },
      });
    }
  }

  console.info("[cron/send-homework] complete", {
    targetDate,
    dayName,
    homeworkRows: homeworkRows.length,
    preparedSends: preparedSends.length,
  });

  return NextResponse.json({
    ok: true,
    date: targetDate,
    day: dayName,
    count: preparedSends.length,
    sends: preparedSends,
  });
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
