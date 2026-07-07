import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../lib/adminAuth";
import getSupabaseServerClient from "../../../lib/supabaseServer";
import { generateWeeklyHomeworkWithUsage } from "../../../lib/homeworkGeneration";
import { getSupabaseCurriculumContent, getSupabaseRecentHomeworkTopics, getSupabaseStudents } from "../../../lib/supabaseHomeworkData";

function getWeekBounds(referenceDate: Date) {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
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
    const dayName = current.toLocaleDateString("en-NZ", { weekday: "long" });
    if (dayName === "Monday" || dayName === "Wednesday" || dayName === "Friday") {
      days.push({
        date: current.toLocaleDateString("en-NZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        dateStr: current.toISOString().slice(0, 10),
      });
    }
  }

  return days;
}

function isValidYearLevel(value: unknown) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1 && year <= 10;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const yearLevel = url.searchParams.get("yearLevel")?.trim() || "6";
  const referenceDate = new Date();
  const { start, end } = getWeekBounds(referenceDate);
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("homework_entries")
    .select("id, date, day, maths_topic, maths_questions, reading_title, reading_questions, writing_type, writing_prompt, grammar_topic, grammar_exercise, year_level, generated_at, created_at")
    .gte("date", start.toISOString().slice(0, 10))
    .lte("date", end.toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .order("year_level", { ascending: true });

  if (yearLevel) {
    query = query.eq("year_level", yearLevel);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, homework: data || [] });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const yearLevel = isValidYearLevel(body.yearLevel) ? String(body.yearLevel) : "6";
    const referenceDate = body.referenceDate ? new Date(String(body.referenceDate)) : new Date();
    const referenceDateString = referenceDate.toISOString().slice(0, 10);

    const schoolDays = getSchoolDaysInWeek(referenceDate);
    const dayDates = schoolDays.map((day) => day.dateStr);
    const supabase = getSupabaseServerClient();

    const { data: existingRows, error: existingError } = await supabase
      .from("homework_entries")
      .select("date")
      .eq("year_level", yearLevel)
      .in("date", dayDates);

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    const existingDates = new Set((existingRows || []).map((row) => String(row.date || "")));
    const missingDays = schoolDays.filter((day) => !existingDates.has(day.dateStr));

    if (missingDays.length === 0) {
      await supabase.from("claude_usage_logs").insert([
        {
          source_route: "/api/admin/homework",
          year_level: yearLevel,
          reference_date: referenceDateString,
          generated_rows: 0,
          school_days_count: schoolDays.length,
          status: "skipped-existing",
          error_message: null,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          model: null,
          max_tokens: null,
        },
      ]);

      return NextResponse.json({ ok: true, count: 0, skipped: true });
    }

    const [curriculumContent, recentTopics, students] = await Promise.all([
      getSupabaseCurriculumContent(yearLevel),
      getSupabaseRecentHomeworkTopics(yearLevel, referenceDate),
      getSupabaseStudents(),
    ]);

    const { entries: generatedHomework, usage } = await generateWeeklyHomeworkWithUsage({
      yearLevel,
      schoolDays: missingDays,
      curriculumContent,
      recentTopics,
      students,
    });

    const rows = generatedHomework.map((entry) => ({
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

    const { error } = await supabase.from("homework_entries").upsert(rows, {
      onConflict: "date,year_level",
      ignoreDuplicates: false,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }

    await supabase.from("claude_usage_logs").insert([
      {
        source_route: "/api/admin/homework",
        year_level: yearLevel,
        reference_date: referenceDateString,
        generated_rows: rows.length,
        school_days_count: missingDays.length,
        status: "generated",
        error_message: null,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
        model: usage.model,
        max_tokens: usage.maxTokens,
      },
    ]);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate homework";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
