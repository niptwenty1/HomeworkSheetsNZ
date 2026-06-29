import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import getSupabaseServerClient from "../../lib/supabaseServer";

function computeHmacBase64(message: string, secret: string) {
  return createHmac("sha256", secret).update(message).digest("base64");
}

function verifySignature({ email, name, date, sig, secret }: { email: string; name: string; date: string; sig: string; secret: string; }) {
  if (!sig) return false;

  try {
    // signature was produced as: base64(hmac_sha256(data, secret)) then encodeURIComponent
    const decodedSig = decodeURIComponent(sig);

    const message = `${email}|${date}|${name}`;
    const expectedBase64 = computeHmacBase64(message, secret);

    // compare raw bytes of the decoded base64 payloads for timing-safe equality
    const expectedBuf = Buffer.from(expectedBase64, "base64");
    const sigBuf = Buffer.from(decodedSig, "base64");
    console.error("expectedBuf", expectedBuf.toString("base64"), "sigBuf", sigBuf.toString("base64"));

    if (expectedBuf.length === sigBuf.length && timingSafeEqual(expectedBuf, sigBuf)) {
      return true;
    }
  } catch (e) {
    // fall through to false
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email = "", name = "", year = "", date = "", sig = "" } = body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, error: "Supabase is not configured" },
        { status: 500 },
      );
    }

    const secret = process.env.COMPLETE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Signature secret is not configured" },
        { status: 500 },
      );
    }

    const isValid = verifySignature({ email, name, date, sig, secret });
    if (!isValid) {
      console.error("Invalid completion signature for", email, name, date);
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const completionPayload = {
      email,
      name,
      year,
      date,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("completions").insert([completionPayload]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 },
    );
  }
}
