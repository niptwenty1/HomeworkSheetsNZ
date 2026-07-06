import { createHash } from "crypto";
import { NextResponse } from "next/server";
import getSupabaseServerClient from "../../../lib/supabaseServer";
import { generateWeeklyHomework } from "../../../lib/homeworkGeneration";
import { getSupabaseCurriculumContent, getSupabaseRecentHomeworkTopics, getSupabaseStudents } from "../../../lib/supabaseHomeworkData";

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

function getDayName(date: Date) {
  return date.toLocaleDateString("en-NZ", { weekday: "long" });
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSchoolDaysInWeek(referenceDate: Date) {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);

  const days = [] as Array<{ date: string; dateStr: string }>;
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

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  if (vercelCronHeader === "1") {
    return true;
  }

  return Boolean(cronSecret && verifySecretHeader(headerSecret, cronSecret));
}

async function generateForAllYearLevels(referenceDate: Date) {
  const schoolDays = getSchoolDaysInWeek(referenceDate);
  const students = await getSupabaseStudents();
  const supabase = getSupabaseServerClient();
  const years = Array.from({ length: 10 }, (_, index) => String(index + 1));
  const generated: Array<{ yearLevel: string; count: number }> = [];

  for (const yearLevel of years) {
    const [curriculumContent, recentTopics] = await Promise.all([
      getSupabaseCurriculumContent(yearLevel),
      getSupabaseRecentHomeworkTopics(yearLevel, referenceDate),
    ]);

    const generatedHomework = await generateWeeklyHomework({
      yearLevel,
      schoolDays,
      curriculumContent,
      recentTopics,
      students,
    });

    const rows = generatedHomework.map((entry) => ({
      date: schoolDays.find((day) => day.date === entry.date)?.dateStr || null,
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

    const { error } = await supabase.from("homework_entries").upsert(rows, {
      onConflict: "date,year_level",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Year ${yearLevel}: ${error.message}`);
    }

    generated.push({ yearLevel, count: rows.length });
  }

  return generated;
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const referenceDateParam = url.searchParams.get("referenceDate");
  const referenceDate = referenceDateParam ? new Date(referenceDateParam) : new Date();

  try {
    const generated = await generateForAllYearLevels(referenceDate);
    const total = generated.reduce((sum, entry) => sum + entry.count, 0);

    return NextResponse.json({
      ok: true,
      total,
      generated,
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