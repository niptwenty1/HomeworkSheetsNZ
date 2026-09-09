import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../../lib/adminAuth";
import getSupabaseServerClient from "../../../../lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId < 1) {
    return NextResponse.json({ ok: false, error: "Invalid student" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: student, error: studentError } = await supabase
    .from("signups")
    .select("id, child_name, parent_name, email, parent_email, year_level, days, resend, resend_date, resend_reason, created_at")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ ok: false, error: studentError.message }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const [sentEmailsResult, completionsResult] = await Promise.all([
    supabase
      .from("sent_emails")
      .select("id, date, status, created_at")
      .eq("email", student.email)
      .order("date", { ascending: false }),
    supabase
      .from("completions")
      .select("id, date, created_at")
      .eq("email", student.email)
      .order("date", { ascending: false }),
  ]);

  const error = sentEmailsResult.error || completionsResult.error;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const deliveryDates = [...new Set((sentEmailsResult.data || []).map((delivery) => delivery.date).filter(Boolean))];
  const { data: homeworkEntries, error: homeworkError } = deliveryDates.length
    ? await supabase
      .from("homework_entries")
      .select("id, date, day, maths_topic, reading_title, writing_type, grammar_topic, year_level")
      .eq("year_level", student.year_level)
      .in("date", deliveryDates)
    : { data: [], error: null };

  if (homeworkError) {
    return NextResponse.json({ ok: false, error: homeworkError.message }, { status: 500 });
  }

  const homeworkByDate = new Map((homeworkEntries || []).map((entry) => [entry.date, entry]));
  const completionDates = new Set((completionsResult.data || []).map((completion) => completion.date));
  const history = (sentEmailsResult.data || [])
    .filter((delivery) => delivery.status?.toLowerCase() !== "failed")
    .map((delivery) => {
      const homework = homeworkByDate.get(delivery.date);
      return {
        id: delivery.id,
        date: delivery.date,
        status: delivery.status,
        completed: completionDates.has(delivery.date),
        topics: homework
          ? [
            { subject: "Maths", topic: homework.maths_topic },
            { subject: "Reading", topic: homework.reading_title },
            { subject: "Writing", topic: homework.writing_type },
            { subject: "Grammar", topic: homework.grammar_topic },
          ].filter((item) => item.topic)
          : [],
      };
    });

  return NextResponse.json({
    ok: true,
    student,
    summary: {
      receivedCount: history.length,
      completedCount: completionsResult.data?.length || 0,
      lastReceivedDate: history[0]?.date || null,
      lastCompletedDate: completionsResult.data?.[0]?.date || null,
    },
    history,
  });
}
