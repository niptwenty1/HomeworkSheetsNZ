import { NextResponse } from "next/server";
import { hashEmailVerificationToken } from "../../lib/emailVerification";
import getSupabaseServerClient from "../../lib/supabaseServer";
import { syncSignupToMailerLite } from "../../lib/mailerlite";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Verification token is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const tokenHash = hashEmailVerificationToken(token);
  const { data: signup, error } = await supabase
    .from("signups")
    .select("id, parent_email, child_name, parent_name, parent_email_verification_expires_at")
    .eq("parent_email_verification_token_hash", tokenHash)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "Unable to verify email" }, { status: 500 });
  }

  if (!signup || !signup.parent_email_verification_expires_at || new Date(signup.parent_email_verification_expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, error: "This verification link is invalid or has expired" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("signups")
    .update({
      parent_email_verified_at: new Date().toISOString(),
      parent_email_verification_token_hash: null,
      parent_email_verification_expires_at: null,
    })
    .eq("parent_email", signup.parent_email)
    .is("parent_email_verified_at", null);

  if (updateError) {
    return NextResponse.json({ ok: false, error: "Unable to verify email" }, { status: 500 });
  }

  if (signup.parent_email) {
    const mailerLiteResult = await syncSignupToMailerLite({
      parentEmail: signup.parent_email,
      childName: signup.child_name,
      parentName: signup.parent_name,
    });
    if (!mailerLiteResult.ok) {
      console.error("MailerLite verification sync failed:", mailerLiteResult.reason);
    }
  }

  return NextResponse.redirect(new URL("/?emailVerified=1", request.url));
}