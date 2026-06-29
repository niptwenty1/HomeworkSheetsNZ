import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import getSupabaseServerClient from "../../lib/supabaseServer";

type SignupPayload = {
  childName?: unknown;
  yearLevel?: unknown;
  email?: unknown;
  parentName?: unknown;
  referrerName?: unknown;
};

function verifySecretHeader(headerValue: string | null, secret: string) {
  if (!headerValue) return false;
  const headerBuffer = Buffer.from(headerValue, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");
  if (headerBuffer.length !== secretBuffer.length) return false;
  return timingSafeEqual(headerBuffer, secretBuffer);
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validYearLevels = new Set([
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
]);


export async function POST(request: Request) {
  let payload: SignupPayload;

  try {
    payload = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const childName =
    typeof payload.childName === "string" ? payload.childName.trim() : "";
  const yearLevel =
    typeof payload.yearLevel === "string" ? payload.yearLevel.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const parentName = typeof payload.parentName === "string" ? payload.parentName.trim() : "";
  const referrerName = typeof payload.referrerName === "string" ? payload.referrerName.trim() : "";

  if (!childName || !parentName ||  !validYearLevels.has(yearLevel) || !emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid signup details" },
      { status: 400 },
    );
  }

  const signupSecret = process.env.HOMEWORK_SIGNUP_SECRET;
  const headerSecret = request.headers.get("x-homework-signup-key");

  if (!signupSecret || !verifySecretHeader(headerSecret, signupSecret)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Ensure Supabase is configured
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 500 },
    );
  }

  try {
    const timestamp = Date.now();

    const signupPayload = {
      child_name: childName,
      year_level: yearLevel,
      email,
      parent_name: parentName,
      referrer_name: referrerName,
      created_at: new Date(timestamp).toISOString(),
    };


    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("signups").insert([signupPayload]);

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return NextResponse.json({ ok: true });
  } catch {

    return NextResponse.json(
      { ok: false, error: "Unable to process signup request. Please try again later." },
      { status: 502 },
    );
  }
}
