import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { generateWeeklyHomeworkWithUsage } from "../../../lib/homeworkGeneration";
import { getSupabaseCurriculumContent, getSupabaseRecentHomeworkTopics, getSupabaseStudents } from "../../../lib/supabaseHomeworkData";
import getSupabaseServerClient from "../../../lib/supabaseServer";

const DEFAULT_CONCURRENCY = 3;

type SchoolDay = {
  date: string;
  dateStr: string;
};

type YearRunResult = {
  yearLevel: string;
  status: "generated" | "skipped-existing" | "failed";
  generated: number;
  error?: string;
};

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

function getSchoolDaysInWeek(referenceDate: Date): SchoolDay[] {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);

  const days: SchoolDay[] = [];
  for (let i = 0; i < 5; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dayName = getDayName(current);
    if (dayName === "Monday" || dayName === "Wednesday" || dayName === "Friday") {
      days.push({
        date: current.toLocaleDateString("en-NZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        dateStr: getDateString(current),
      });
    }
  }

  return days;
}

function getTargetYearLevels(url: URL) {
  const single = url.searchParams.get("yearLevel")?.trim();
  if (single) {
    return [single];
  }

  const csv = url.searchParams.get("yearLevels")?.trim();
  if (!csv) {
    return Array.from({ length: 10 }, (_, index) => String(index + 1));
  }

  return csv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getConcurrency(url: URL) {
  const requested = Number(url.searchParams.get("concurrency") || DEFAULT_CONCURRENCY);
  if (!Number.isFinite(requested) || requested <= 0) {
    return DEFAULT_CONCURRENCY;
  }

  return Math.min(5, Math.floor(requested));
}

async function logUsage(params: {
  yearLevel: string;
  referenceDate: string;
  generatedRows: number;
  schoolDaysCount: number;
  status: string;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  maxTokens?: number;
}) {
  const supabase = getSupabaseServerClient();
  await supabase.from("claude_usage_logs").insert([
    {
      source_route: "/api/cron/generate-weekly",
      year_level: params.yearLevel,
      reference_date: params.referenceDate,
      generated_rows: params.generatedRows,
      school_days_count: params.schoolDaysCount,
      status: params.status,
      error_message: params.errorMessage || null,
      input_tokens: params.inputTokens || 0,
      output_tokens: params.outputTokens || 0,
      total_tokens: params.totalTokens || 0,
      model: params.model || null,
      max_tokens: params.maxTokens || null,
    },
  ]);
}

async function processYearLevel(params: {
  yearLevel: string;
  referenceDate: Date;
  schoolDays: SchoolDay[];
  students: Array<{ name?: string; email?: string; level?: string; difficultyLevel?: string; days?: string }>;
}): Promise<YearRunResult> {
  const { yearLevel, referenceDate, schoolDays, students } = params;
  const supabase = getSupabaseServerClient();
  const referenceDateStr = getDateString(referenceDate);

  try {
    const dayDates = schoolDays.map((day) => day.dateStr);
    const { data: existingRows, error: existingError } = await supabase
      .from("homework_entries")
      .select("date")
      .eq("year_level", yearLevel)
      .in("date", dayDates);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingDates = new Set((existingRows || []).map((row) => String(row.date || "")));
    const missingDays = schoolDays.filter((day) => !existingDates.has(day.dateStr));

    if (missingDays.length === 0) {
      await logUsage({
        yearLevel,
        referenceDate: referenceDateStr,
        generatedRows: 0,
        schoolDaysCount: schoolDays.length,
        status: "skipped-existing",
      });

      return {
        yearLevel,
        status: "skipped-existing",
        generated: 0,
      };
    }

    const [curriculumContent, recentTopics] = await Promise.all([
      getSupabaseCurriculumContent(yearLevel),
      getSupabaseRecentHomeworkTopics(yearLevel, referenceDate),
    ]);

    const { entries, usage } = await generateWeeklyHomeworkWithUsage({
      yearLevel,
      schoolDays: missingDays,
      curriculumContent,
      recentTopics,
      students,
    });

    const displayDateToDateStr = new Map(missingDays.map((day) => [day.date, day.dateStr]));
    const rows = entries
      .map((entry) => ({
        date: displayDateToDateStr.get(entry.date) || null,
        day: entry.date.split(" ")[0],
        maths_topic: entry.maths.topic,
        maths_instructions: entry.maths.instructions,
        maths_questions: entry.maths.questions,
        maths_word_problem: entry.maths.word_problem,
        reading_title: entry.english.reading_passage.title,
        reading_text: entry.english.reading_passage.text,
        reading_questions: entry.english.reading_passage.questions,
        writing_type: entry.english.writing_task.type,
        writing_prompt: entry.english.writing_task.prompt,
        writing_word_count: entry.english.writing_task.word_count,
        grammar_topic: entry.english.grammar_focus.topic,
        grammar_instruction: entry.english.grammar_focus.instruction,
        grammar_exercise: entry.english.grammar_focus.exercise,
        year_level: yearLevel,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }))
      .filter((row) => Boolean(row.date));

    if (rows.length === 0) {
      throw new Error("Generated entries did not map to expected school days.");
    }

    const { error: upsertError } = await supabase.from("homework_entries").upsert(rows, {
      onConflict: "date,year_level",
      ignoreDuplicates: false,
    });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    await logUsage({
      yearLevel,
      referenceDate: referenceDateStr,
      generatedRows: rows.length,
      schoolDaysCount: missingDays.length,
      status: "generated",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      model: usage.model,
      maxTokens: usage.maxTokens,
    });

    return {
      yearLevel,
      status: "generated",
      generated: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await logUsage({
      yearLevel,
      referenceDate: referenceDateStr,
      generatedRows: 0,
      schoolDaysCount: 0,
      status: "failed",
      errorMessage: message,
    });

    return {
      yearLevel,
      status: "failed",
      generated: 0,
      error: message,
    };
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;

      if (current >= items.length) {
        return;
      }

      results[current] = await worker(items[current]);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => consume());
  await Promise.all(runners);
  return results;
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
  const referenceDateParam = url.searchParams.get("referenceDate");
  const referenceDate = referenceDateParam ? new Date(referenceDateParam) : new Date();
  const yearLevels = getTargetYearLevels(url);
  const concurrency = getConcurrency(url);
  const schoolDays = getSchoolDaysInWeek(referenceDate);

  try {
    const referenceDateStr = getDateString(referenceDate);
    const students = await getSupabaseStudents();

    const results = await runWithConcurrency(yearLevels, concurrency, async (yearLevel) => {
      return processYearLevel({
        yearLevel,
        referenceDate,
        schoolDays,
        students,
      });
    });

    const completed = results.filter((result) => result.status !== "failed").length;
    const failed = results.filter((result) => result.status === "failed").length;
    const generatedTotal = results.reduce((sum, result) => sum + result.generated, 0);

    return NextResponse.json({
      ok: true,
      referenceDate: referenceDateStr,
      schoolDays: schoolDays.map((day) => day.dateStr),
      yearLevels,
      concurrency,
      totalYears: yearLevels.length,
      generatedTotal,
      completed,
      failed,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate weekly homework";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}