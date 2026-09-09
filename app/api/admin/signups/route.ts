import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../lib/adminAuth";
import getSupabaseServerClient from "../../../lib/supabaseServer";

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
      ? supabase.from("sent_emails").select("email, date, status").in("email", studentEmails)
      : Promise.resolve({ data: [], error: null }),
    studentEmails.length > 0
      ? supabase.from("completions").select("email, date").in("email", studentEmails)
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
