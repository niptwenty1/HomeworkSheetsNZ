import { createHash } from "crypto";
import { NextResponse } from "next/server";
import getSupabaseServerClient from "../../../lib/supabaseServer";

function verifySecretHeader(headerValue: string | null, secret: string) {
  if (!headerValue) return false;
  const headerBuffer = Buffer.from(headerValue, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");
  if (headerBuffer.length !== secretBuffer.length) return false;

  try {
    const headerHash = createHash("sha256").update(headerBuffer).digest("hex");
    const secretHash = createHash("sha256").update(secretBuffer).digest("hex");
    return headerHash === secretHash;
  } catch {
    return false;
  }
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const vercelCronSchedule = request.headers.get("x-vercel-cron-schedule");
  const userAgent = request.headers.get("user-agent") || "";

  if (vercelCronHeader === "1" || Boolean(vercelCronSchedule) || userAgent.includes("vercel-cron/1.0")) {
    return true;
  }

  return Boolean(cronSecret && verifySecretHeader(headerSecret, cronSecret));
}

async function generateForAllYearLevels(referenceDate: Date) {
  const supabase = getSupabaseServerClient();
  const years = Array.from({ length: 10 }, (_, index) => String(index + 1));
  const referenceDateStr = getDateString(referenceDate);
  const queueRows = years.map((yearLevel) => ({
    reference_date: referenceDateStr,
    year_level: yearLevel,
    status: "queued",
    attempts: 0,
    last_error: null,
    source_route: "/api/cron/generate-weekly",
    started_at: null,
    finished_at: null,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("homework_generation_queue")
    .upsert(queueRows, { onConflict: "reference_date,year_level" })
    .select("id, year_level, status");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Array<{ id: number; year_level: string; status: string }>;
}

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function dispatchWorkerTask(workerUrl: string, cronSecret?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    await fetch(workerUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vercel-cron": "1",
        ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
      },
      signal: controller.signal,
    });

    return { accepted: true as const };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // The worker request was initiated and intentionally timed out client-side.
      return { accepted: true as const };
    }

    return { accepted: false as const };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const referenceDateParam = url.searchParams.get("referenceDate");
  const referenceDate = referenceDateParam ? new Date(referenceDateParam) : new Date();

  try {
    const queuedTasks = await generateForAllYearLevels(referenceDate);
    const referenceDateStr = getDateString(referenceDate);
    const baseUrl = getBaseUrl(request);
    const cronSecret = process.env.CRON_SECRET;

    const dispatches = queuedTasks.map((task) => {
      const workerUrl = `${baseUrl}/api/cron/generate-weekly-worker?queueId=${task.id}&referenceDate=${referenceDateStr}&yearLevel=${task.year_level}`;
      return dispatchWorkerTask(workerUrl, cronSecret);
    });

    const dispatchResults = await Promise.all(dispatches);
    const dispatched = dispatchResults.filter((result) => result.accepted).length;

    return NextResponse.json({
      ok: true,
      referenceDate: referenceDateStr,
      queued: queuedTasks.length,
      dispatched,
      tasks: queuedTasks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate weekly homework";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}