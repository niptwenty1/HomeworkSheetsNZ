import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../lib/adminAuth";
import getSupabaseServerClient from "../../../lib/supabaseServer";

// Supabase/PostgREST caps a single select at db.max_rows (default 1000), so
// large tables like sent_emails must be paginated to get an accurate count.
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) {
      return { data: rows, error };
    }
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return { data: rows, error: null };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: signups, error } = await supabase
    .from("signups")
    .select("id, child_name, parent_name, email, parent_email, year_level, days, resend, resend_date, resend_reason, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const studentEmails = (signups || []).map((signup) => signup.email);
  const [sentEmailsResult, completionsResult] = await Promise.all([
    studentEmails.length > 0
      ? fetchAllRows((from, to) =>
          supabase.from("sent_emails").select("email, date, status").in("email", studentEmails).range(from, to),
        )
      : Promise.resolve({ data: [], error: null }),
    studentEmails.length > 0
      ? fetchAllRows((from, to) =>
          supabase.from("completions").select("email, date").in("email", studentEmails).range(from, to),
        )
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sentEmailsResult.error || completionsResult.error) {
    return NextResponse.json(
      { ok: false, error: sentEmailsResult.error?.message || completionsResult.error?.message },
      { status: 500 },
    );
  }

  const activityByEmail = new Map<string, { receivedCount: number; completedCount: number; lastReceivedDate: string | null; lastCompletedDate: string | null }>();
  for (const signup of signups || []) {
    activityByEmail.set(signup.email, { receivedCount: 0, completedCount: 0, lastReceivedDate: null, lastCompletedDate: null });
  }

  for (const sentEmail of sentEmailsResult.data || []) {
    const activity = activityByEmail.get(sentEmail.email);
    if (!activity || sentEmail.status?.toLowerCase() === "failed") continue;
    activity.receivedCount += 1;
    if (sentEmail.date && (!activity.lastReceivedDate || sentEmail.date > activity.lastReceivedDate)) {
      activity.lastReceivedDate = sentEmail.date;
    }
  }

  for (const completion of completionsResult.data || []) {
    const activity = activityByEmail.get(completion.email);
    if (!activity) continue;
    activity.completedCount += 1;
    if (completion.date && (!activity.lastCompletedDate || completion.date > activity.lastCompletedDate)) {
      activity.lastCompletedDate = completion.date;
    }
  }

  return NextResponse.json({
    ok: true,
    signups: (signups || []).map((signup) => ({
      ...signup,
      activity: activityByEmail.get(signup.email),
    })),
  });
}
