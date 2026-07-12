import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { sendCronSummaryEmail } from "../../../lib/cronSummaryEmail";
import { generateWeeklyHomeworkWithUsage } from "../../../lib/homeworkGeneration";
import getSupabaseServerClient from "../../../lib/supabaseServer";
import { getSupabaseCurriculumContent, getSupabaseRecentHomeworkTopics, getSupabaseStudents } from "../../../lib/supabaseHomeworkData";

const MAX_ATTEMPTS = 3;

type SchoolDay = {
  date: string;
  dateStr: string;
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
      source_route: "/api/cron/generate-weekly-worker",
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

async function handleRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const url = new URL(request.url);
  const queueId = Number(url.searchParams.get("queueId") || 0);
  const yearLevelParam = url.searchParams.get("yearLevel")?.trim();
  const referenceDateParam = url.searchParams.get("referenceDate")?.trim();

  let task: {
    id: number;
    year_level: string;
    reference_date: string;
    status: string;
    attempts: number;
  } | null = null;

  if (queueId > 0) {
    const { data, error } = await supabase
      .from("homework_generation_queue")
      .select("id, year_level, reference_date, status, attempts")
      .eq("id", queueId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Queue task not found" }, { status: 404 });
    }

    task = {
      id: Number(data.id),
      year_level: String(data.year_level),
      reference_date: String(data.reference_date),
      status: String(data.status),
      attempts: Number(data.attempts || 0),
    };
  } else {
    let query = supabase
      .from("homework_generation_queue")
      .select("id, year_level, reference_date, status, attempts")
      .in("status", ["queued", "failed"])
      .lt("attempts", MAX_ATTEMPTS)
      .order("updated_at", { ascending: true })
      .limit(1);

    if (yearLevelParam) {
      query = query.eq("year_level", yearLevelParam);
    }

    if (referenceDateParam) {
      query = query.eq("reference_date", referenceDateParam);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: true, message: "No queued tasks" });
    }

    const item = data[0];
    task = {
      id: Number(item.id),
      year_level: String(item.year_level),
      reference_date: String(item.reference_date),
      status: String(item.status),
      attempts: Number(item.attempts || 0),
    };
  }

  if (!task) {
    return NextResponse.json({ ok: true, message: "No queued tasks" });
  }

  if (task.attempts >= MAX_ATTEMPTS && task.status !== "queued") {
    return NextResponse.json({ ok: false, error: "Task exceeded retry attempts" }, { status: 409 });
  }

  const startedAt = new Date().toISOString();
  const nextAttempts = task.attempts + 1;
  const { data: claimed, error: claimError } = await supabase
    .from("homework_generation_queue")
    .update({
      status: "processing",
      attempts: nextAttempts,
      last_error: null,
      started_at: startedAt,
      updated_at: startedAt,
    })
    .eq("id", task.id)
    .in("status", ["queued", "failed"])
    .select("id, year_level, reference_date, attempts")
    .single();

  if (claimError || !claimed) {
    return NextResponse.json({ ok: false, error: "Unable to claim task" }, { status: 409 });
  }

  const yearLevel = String(claimed.year_level);
  const referenceDateStr = String(claimed.reference_date);

  try {
    const referenceDate = new Date(`${referenceDateStr}T12:00:00`);
    const schoolDays = getSchoolDaysInWeek(referenceDate);
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
      const finishedAt = new Date().toISOString();
      await supabase
        .from("homework_generation_queue")
        .update({
          status: "completed",
          finished_at: finishedAt,
          updated_at: finishedAt,
          last_error: null,
        })
        .eq("id", task.id);

      await logUsage({
        yearLevel,
        referenceDate: referenceDateStr,
        generatedRows: 0,
        schoolDaysCount: schoolDays.length,
        status: "skipped-existing",
      });

      await sendCronSummaryEmail({
        kind: "generate-weekly-worker",
        targetDate: referenceDateStr,
        status: "skipped-existing",
        yearLevel,
        referenceDate: referenceDateStr,
        counts: {
          total: 0,
          generated: 0,
          skipped: 1,
        },
        details: [
          `Queue ID: ${task.id}`,
          `Year level: ${yearLevel}`,
          `School days in week: ${schoolDays.length}`,
          "All homework rows already existed for this year level and date range.",
        ],
      });

      return NextResponse.json({ ok: true, queueId: task.id, yearLevel, status: "skipped-existing", generated: 0 });
    }

    const students = await getSupabaseStudents();
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

    const rows = entries.map((entry) => ({
      date: missingDays.find((day) => day.date === entry.date)?.dateStr || null,
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
    }));

    const { error: upsertError } = await supabase.from("homework_entries").upsert(rows, {
      onConflict: "date,year_level",
      ignoreDuplicates: false,
    });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const finishedAt = new Date().toISOString();
    await supabase
      .from("homework_generation_queue")
      .update({
        status: "completed",
        finished_at: finishedAt,
        updated_at: finishedAt,
        last_error: null,
      })
      .eq("id", task.id);

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

    await sendCronSummaryEmail({
      kind: "generate-weekly-worker",
      targetDate: referenceDateStr,
      status: "generated",
      yearLevel,
      referenceDate: referenceDateStr,
      counts: {
        total: rows.length,
        generated: rows.length,
      },
      details: [
        `Queue ID: ${task.id}`,
        `Year level: ${yearLevel}`,
        `Generated rows: ${rows.length}`,
        `School days processed: ${missingDays.length}`,
      ],
    });

    return NextResponse.json({ ok: true, queueId: task.id, yearLevel, status: "generated", generated: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    const shouldRetry = nextAttempts < MAX_ATTEMPTS;
    const now = new Date().toISOString();

    await supabase
      .from("homework_generation_queue")
      .update({
        status: shouldRetry ? "queued" : "failed",
        last_error: message,
        finished_at: shouldRetry ? null : now,
        updated_at: now,
      })
      .eq("id", task.id);

    await logUsage({
      yearLevel,
      referenceDate: referenceDateStr,
      generatedRows: 0,
      schoolDaysCount: 0,
      status: shouldRetry ? "retry-queued" : "failed",
      errorMessage: message,
    });

    await sendCronSummaryEmail({
      kind: "generate-weekly-worker",
      targetDate: referenceDateStr,
      status: shouldRetry ? "retry-queued" : "failed",
      yearLevel,
      referenceDate: referenceDateStr,
      counts: {
        total: 0,
        failed: 1,
      },
      details: [
        `Queue ID: ${task.id}`,
        `Year level: ${yearLevel}`,
        `Error: ${message}`,
      ],
    });

    return NextResponse.json(
      {
        ok: false,
        queueId: task.id,
        yearLevel,
        status: shouldRetry ? "retry-queued" : "failed",
        error: message,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
