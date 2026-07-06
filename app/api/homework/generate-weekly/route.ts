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

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");

  if (!cronSecret || !verifySecretHeader(headerSecret, cronSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const yearLevel = String(body.yearLevel || "6");
  const referenceDate = body.referenceDate ? new Date(String(body.referenceDate)) : new Date();

  const schoolDays = getSchoolDaysInWeek(referenceDate);
  const [curriculumContent, recentTopics, students] = await Promise.all([
    getSupabaseCurriculumContent(yearLevel),
    getSupabaseRecentHomeworkTopics(yearLevel, referenceDate),
    getSupabaseStudents(),
  ]);

  const generatedHomework = await generateWeeklyHomework({
    yearLevel,
    schoolDays,
    curriculumContent,
    recentTopics,
    students,
  });

  const supabase = getSupabaseServerClient();
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
