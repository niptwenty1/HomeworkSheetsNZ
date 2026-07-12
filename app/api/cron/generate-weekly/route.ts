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

async function runWorkerTask(workerUrl: string, cronSecret?: string) {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-cron": "1",
      ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
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
      return runWorkerTask(workerUrl, cronSecret);
    });

    const dispatchResults = await Promise.allSettled(dispatches);
    const workerResults = dispatchResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return {
          queueId: queuedTasks[index].id,
          yearLevel: queuedTasks[index].year_level,
          ok: result.value.ok,
          statusCode: result.value.status,
          status: String(result.value.payload.status || "unknown"),
          generated: Number(result.value.payload.generated || 0),
          error: result.value.payload.error ? String(result.value.payload.error) : null,
        };
      }

      return {
        queueId: queuedTasks[index].id,
        yearLevel: queuedTasks[index].year_level,
        ok: false,
        statusCode: 0,
        status: "dispatch-error",
        generated: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    const completed = workerResults.filter((result) => result.ok).length;
    const failed = workerResults.length - completed;

    return NextResponse.json({
      ok: true,
      referenceDate: referenceDateStr,
      queued: queuedTasks.length,
      completed,
      failed,
      results: workerResults,
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