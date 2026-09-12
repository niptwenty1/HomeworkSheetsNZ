import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../../lib/adminAuth";
import getSupabaseServerClient from "../../../../lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const EDITABLE_FIELDS = [
  "maths_topic",
  "maths_instructions",
  "maths_questions",
  "maths_word_problem",
  "reading_title",
  "reading_text",
  "reading_questions",
  "writing_type",
  "writing_prompt",
  "writing_word_count",
  "grammar_topic",
  "grammar_instruction",
  "grammar_exercise",
] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId < 1) {
    return NextResponse.json({ ok: false, error: "Invalid homework entry" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework_entries")
    .update(updates)
    .eq("id", entryId)
    .select("id, date, day, maths_topic, maths_instructions, maths_questions, maths_word_problem, reading_title, reading_text, reading_questions, writing_type, writing_prompt, writing_word_count, grammar_topic, grammar_instruction, grammar_exercise, year_level, generated_at, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Homework entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, homework: data });
}
