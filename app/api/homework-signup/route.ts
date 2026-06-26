import { createHmac } from "crypto";
import { NextResponse } from "next/server";

type SignupPayload = {
  childName?: unknown;
  yearLevel?: unknown;
  email?: unknown;
  parentName?: unknown;
  referrerName?: unknown;
};

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

function signPayload({
  childName,
  yearLevel,
  email,
  timestamp,
  secret,
}: {
  childName: string;
  yearLevel: string;
  email: string;
  timestamp: number;
  secret: string;
}) {
  const message = JSON.stringify([timestamp, childName, yearLevel, email]);

  return createHmac("sha256", secret).update(message).digest("hex");
}

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

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets webhook is not configured" },
      { status: 500 },
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Google Sheets webhook secret is not configured" },
      { status: 500 },
    );
  }

  try {
    const timestamp = Date.now();
    const signature = signPayload({
      childName,
      yearLevel,
      email,
      timestamp,
      secret: webhookSecret,
    });

     const signupPayload = {
      childName,
      yearLevel,
      email,
      parentName,
      referrerName,
      timestamp,
      signature,
    };

    console.log("Signup payload before sending to Google Sheets:", signupPayload);

    const sheetsResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        childName,
        yearLevel,
        email,
        parentName,
        referrerName,
        timestamp,
        signature,
      }),
    });

    const sheetsText = await sheetsResponse.text();

    if (!sheetsResponse.ok) {
      throw new Error(
        `Apps Script request failed (${sheetsResponse.status}): ${sheetsText || sheetsResponse.statusText}`,
      );
    }

    const sheetsResult = JSON.parse(sheetsText) as { ok?: boolean };

    if (!sheetsResult.ok) {
      throw new Error(
        `Apps Script rejected the signup details: ${sheetsText}`,
      );
    }

    return NextResponse.json({ ok: true });
  } catch {

    return NextResponse.json(
      { ok: false, error: "Unable to process signup request. Please try again later." },
      { status: 502 },
    );
  }
}
