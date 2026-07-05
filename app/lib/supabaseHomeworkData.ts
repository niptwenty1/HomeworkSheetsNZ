import getSupabaseServerClient from "./supabaseServer";

export async function getSupabaseStudents() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("signups").select("child_name, email, year_level, days");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((student) => ({
    name: student.child_name,
    email: student.email,
    level: student.year_level,
    days: student.days,
  }));
}

export async function getSupabaseCurriculumContent(yearLevel: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("curriculum_items").select("subject, topic, subtopic, skill, difficulty, question_type, example_prompt").eq("year_level", yearLevel);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || [])
    .map((row) => [
      row.subject,
      row.topic,
      row.subtopic,
      row.skill,
      row.difficulty,
      row.question_type,
      row.example_prompt,
    ])
    .filter((row) => row.some(Boolean))
    .map((row) => row.filter(Boolean).join(" | "));

  return rows.join("\n");
}

export async function getSupabaseRecentHomeworkTopics(yearLevel: string, currentDate: Date) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework_entries")
    .select("date, maths_topic, reading_title, writing_type, grammar_topic, generated_at")
    .eq("year_level", yearLevel)
    .lt("generated_at", currentDate.toISOString())
    .order("generated_at", { ascending: false })
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    date: row.date,
    mathsTopic: row.maths_topic,
    readingTopic: row.reading_title,
    writingTopic: row.writing_type,
    grammarTopic: row.grammar_topic,
  }));
}

export async function getSupabaseHomeworkForDate(dateStr: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework_entries")
    .select("date, day, maths_topic, maths_instructions, maths_questions, maths_word_problem, reading_title, reading_text, reading_questions, writing_type, writing_prompt, writing_word_count, grammar_topic, grammar_instruction, grammar_exercise, year_level")
    .eq("date", dateStr);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getStudentByEmail(email: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("signups").select("child_name, email, year_level, days").ilike("email", email).limit(1).single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found single
    throw new Error(error.message);
  }

  return data || null;
}

export async function flagStudentForResend({
  email,
  date,
  reason,
}: {
  email: string | string[];
  date?: string | null;
  reason?: string | null;
}) {
  const supabase = getSupabaseServerClient();
  const normalizedEmails = (Array.isArray(email) ? email : [email])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (normalizedEmails.length === 0) {
    return;
  }

  for (const normalizedEmail of normalizedEmails) {
    const { error } = await supabase
      .from("signups")
      .update({ resend: true, resend_date: date || null, resend_reason: reason || null, resend_requested_at: new Date().toISOString() })
      .ilike("email", normalizedEmail);

    if (error) throw new Error(error.message);
  }
}

export async function getStudentsMarkedForResend() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("signups").select("id, child_name, email, year_level, days, resend_date, resend_reason").eq("resend", true);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function clearResendFlagById(id: number) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("signups").update({ resend: false, resend_date: null, resend_reason: null, resend_requested_at: null }).eq("id", id);
  if (error) console.error("Failed to clear resend flag:", error.message);
}

export async function logSentEmail({
  email,
  name,
  year,
  date,
  status,
  providerResponse,
}: {
  email: string;
  name?: string;
  year?: string;
  date?: string;
  status: string;
  providerResponse?: unknown;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("sent_emails").insert([
    {
      email,
      name: name || null,
      year: year || null,
      date: date || null,
      status,
      provider_response: providerResponse || null,
    },
  ]);

  if (error) {
    console.error("Failed to log sent email:", error.message);
  }
}
