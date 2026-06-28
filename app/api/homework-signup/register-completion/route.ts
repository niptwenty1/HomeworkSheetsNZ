import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email = "", name = "", year = "", date = "", sig = "" } = body;

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "Google Sheets webhook is not configured" },
        { status: 500 },
      );
    }

    // Forward to Apps Script (GET query style to match your existing script),
    // but performed server-side so CORS and secrets are not an issue.
    const params = new URLSearchParams({ email, name, year, date, sig });
    const res = await fetch(`${webhookUrl}?${params.toString()}`, {
      method: "GET",
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Apps Script failed: ${text || res.statusText}` },
        { status: 502 },
      );
    }

    // If your Apps Script returns JSON, you can parse/validate it here.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 },
    );
  }
}
