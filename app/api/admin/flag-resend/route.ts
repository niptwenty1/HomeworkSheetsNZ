import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isAdminEmail } from "../../../lib/adminAuth";
import { flagStudentForResend } from "../../../lib/supabaseHomeworkData";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const date = body?.date ? String(body.date) : null;
    const reason = body?.reason ? String(body.reason) : "Flagged from admin dashboard";

    await flagStudentForResend({ email, date, reason });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to flag resend";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
