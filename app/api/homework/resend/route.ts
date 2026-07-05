import { NextResponse } from "next/server";
import { flagStudentForResend } from "../../../lib/supabaseHomeworkData";

function verifySecretHeader(headerValue: string | null, secret: string) {
  if (!headerValue) return false;
  try {
    return headerValue === secret;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const teacherSecret = process.env.HOMEWORK_SIGNUP_SECRET || process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-homework-signup-key") || request.headers.get("x-cron-secret");

  if (!teacherSecret || !verifySecretHeader(headerSecret, teacherSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email || "").trim();
  const date = body.date ? String(body.date) : null;
  const reason = body.reason ? String(body.reason) : null;

  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  }

  try {
    await flagStudentForResend({ email, date: date || null, reason: reason || null });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
