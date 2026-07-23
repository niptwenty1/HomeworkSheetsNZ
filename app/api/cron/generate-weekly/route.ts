import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { sendCronSummaryEmail } from "../../../lib/cronSummaryEmail";
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

function getNzDateString(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return { year, month, day };
}

function addDays(dateStr: string, amount: number) {
  const { year, month, day } = parseDateParts(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return getDateString(date);
}

function getNzDayIndex(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "long",
  }).format(date);

  const map: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  const value = map[weekday];
  if (value === undefined) {
    throw new Error(`Unsupported weekday: ${weekday}`);
  }

  return value;
}

function getReferenceDateString(url: URL) {
  const provided = url.searchParams.get("referenceDate")?.trim();
  if (!provided) {
    return getNzDateString(new Date());
  }

  // Accept common manual formats and normalize to YYYY-MM-DD.
  const normalized = provided.replace(/\//g, "-");
  const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return getDateString(parsed);
  }

  throw new Error(`Invalid referenceDate: ${provided}. Use YYYY-MM-DD.`);
}

function getWeekStartDateString(referenceDateStr: string) {
  const dayIndex = getNzDayIndex(referenceDateStr);
  const anchorDateStr = dayIndex >= 5 ? addDays(referenceDateStr, dayIndex === 5 ? 2 : 1) : referenceDateStr;
  const anchorDayIndex = getNzDayIndex(anchorDateStr);
  return addDays(anchorDateStr, -anchorDayIndex);
}

function getSchoolDaysFromWeekStart(weekStartDateStr: string): SchoolDay[] {
  const dates = [
    addDays(weekStartDateStr, 0),
    addDays(weekStartDateStr, 2),
    addDays(weekStartDateStr, 4),
  ];

  return dates.map((dateStr) => {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return {
      date: new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date),
      dateStr,
    };
  });
}

function normalizeYearLevel(level: string) {
  const trimmed = String(level || "").trim();
  if (!trimmed) return "";

  const match = trimmed.match(/\d{1,2}/);
  return match ? match[0] : trimmed;
}

function getTargetYearLevels(students: Array<{ level?: string }>) {
  const distinct = Array.from(
    new Set(
      students
        .map((student) => normalizeYearLevel(String(student.level || "")))
        .filter(Boolean),
    ),
  );

  distinct.sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  return distinct;
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
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  billedInputEstimate?: number;
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
      cache_read_input_tokens: params.cacheReadInputTokens || 0,
      cache_creation_input_tokens: params.cacheCreationInputTokens || 0,
      billed_input_estimate: params.billedInputEstimate || 0,
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
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      billedInputEstimate: usage.billedInputEstimate,
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
  let referenceDateStr = "";

  try {
    referenceDateStr = getReferenceDateString(url);
    const weekStartDateStr = getWeekStartDateString(referenceDateStr);
    const referenceDate = new Date(`${weekStartDateStr}T12:00:00Z`);
    const concurrency = getConcurrency(url);
    const schoolDays = getSchoolDaysFromWeekStart(weekStartDateStr);

    console.info("[cron/generate-weekly] start", {
      referenceDate: weekStartDateStr,
      concurrency,
      method: request.method,
    });

    const students = await getSupabaseStudents();
    const yearLevels = getTargetYearLevels(students);

    console.info("[cron/generate-weekly] selected-levels", {
      signupCount: students.length,
      yearLevels,
      totalYears: yearLevels.length,
    });

    if (yearLevels.length === 0) {
      await sendCronSummaryEmail({
        kind: "generate-weekly",
        targetDate: weekStartDateStr,
        status: "no-year-levels",
        referenceDate: weekStartDateStr,
        counts: {
          total: 0,
          generated: 0,
          failed: 0,
          skipped: 1,
        },
        details: ["No year levels found in signups."],
      });

      return NextResponse.json({
        ok: true,
        referenceDate: weekStartDateStr,
        schoolDays: schoolDays.map((day) => day.dateStr),
        yearLevels: [],
        concurrency,
        totalYears: 0,
        generatedTotal: 0,
        completed: 0,
        failed: 0,
        results: [],
        message: "No year levels found in signups.",
      });
    }

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
    const generatedYears = results.filter((result) => result.status === "generated");
    const skippedYears = results.filter((result) => result.status === "skipped-existing");
    const failedYears = results.filter((result) => result.status === "failed");

    await sendCronSummaryEmail({
      kind: "generate-weekly",
      targetDate: weekStartDateStr,
      status: failed > 0 ? "partial-failure" : "complete",
      referenceDate: weekStartDateStr,
      counts: {
        total: yearLevels.length,
        generated: generatedTotal,
        failed,
        skipped: skippedYears.length,
      },
      details: [
        `Concurrency: ${concurrency}`,
        `Year levels processed: ${yearLevels.join(", ")}`,
        `Completed: ${completed}`,
        `Failed: ${failed}`,
        ...generatedYears.map((result) => `Generated Year ${result.yearLevel}: ${result.generated} rows`),
        ...skippedYears.map((result) => `Skipped Year ${result.yearLevel}: rows already existed`),
        ...failedYears.map((result) => `Failed Year ${result.yearLevel}: ${result.error || "Unknown error"}`),
      ],
    });

    return NextResponse.json({
      ok: true,
      referenceDate: weekStartDateStr,
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

    if (referenceDateStr) {
      const weekStartDateStr = getWeekStartDateString(referenceDateStr);
      await sendCronSummaryEmail({
        kind: "generate-weekly",
        targetDate: weekStartDateStr,
        status: "failed",
        referenceDate: weekStartDateStr,
        counts: {
          total: 0,
          generated: 0,
          failed: 1,
        },
        details: [message],
      });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}