"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";

interface SignupRow {
  id: number;
  child_name: string;
  parent_name: string;
  email: string;
  year_level: string;
  days: string | null;
  resend: boolean;
  resend_date: string | null;
  resend_reason: string | null;
  created_at: string;
}

interface HomeworkRow {
  id: number;
  date: string;
  day: string | null;
  maths_topic: string | null;
  maths_questions: string[] | null;
  reading_title: string | null;
  reading_questions: string[] | null;
  writing_type: string | null;
  writing_prompt: string | null;
  grammar_topic: string | null;
  grammar_exercise: string | null;
  year_level: string;
  generated_at: string;
  created_at: string;
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionPayload = {
  user?: SessionUser;
  expires?: string;
};

type SortKey = keyof SignupRow;
type HomeworkSortKey = keyof HomeworkRow;
type HomeworkTopic = "all" | "maths" | "reading" | "writing" | "grammar";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [homeworkLoading, setHomeworkLoading] = useState(true);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [flaggingId, setFlaggingId] = useState<number | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [homeworkSortKey, setHomeworkSortKey] = useState<HomeworkSortKey>("date");
  const [homeworkSortDirection, setHomeworkSortDirection] = useState<"asc" | "desc">("desc");
  const [homeworkYearLevel, setHomeworkYearLevel] = useState("6");
  const [homeworkTopic, setHomeworkTopic] = useState<HomeworkTopic>("all");
  const isAuthorized = Boolean(session?.user);

  useEffect(() => {
    void loadSession();
  }, []);

  const sortedSignups = [...signups].sort((a, b) => compareRows(a, b, sortKey, sortDirection));
  const sortedHomework = [...homework].sort((a, b) => compareHomeworkRows(a, b, homeworkSortKey, homeworkSortDirection));

  async function loadSession() {
    setSessionLoading(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const result = await response.json();
      if (result?.user) {
        setSession(result as SessionPayload);
        void loadSignups();
        void loadHomework(homeworkYearLevel, homeworkTopic);
      } else {
        setSession(null);
        setSignups([]);
        setHomework([]);
      }
    } catch {
      setSession(null);
      setSignups([]);
      setHomework([]);
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadSignups() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/signups", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load signups");
      }
      setSignups(result.signups || []);
      setStatus("Loaded signups");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load signups");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHomework(yearLevel = homeworkYearLevel, topic = homeworkTopic) {
    setHomeworkLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("yearLevel", yearLevel);
      params.set("topic", topic);

      const response = await fetch(`/api/admin/homework?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load homework");
      }
      setHomework(result.homework || []);
      setStatus((current) => current || "Loaded homework");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load homework");
    } finally {
      setHomeworkLoading(false);
    }
  }

  async function handleProcessResends() {
    setProcessing(true);
    setStatus("Processing pending resends...");
    try {
      const response = await fetch("/api/admin/process-resends", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to process resends");
      }
      setStatus(`Processed ${result.processed || 0} resend requests`);
      await loadSignups();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to process resends");
    } finally {
      setProcessing(false);
    }
  }

  async function handleGenerateHomework() {
    setGenerating(true);
    setStatus(`Generating Year ${homeworkYearLevel} homework...`);
    try {
      const response = await fetch("/api/admin/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearLevel: homeworkYearLevel }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to generate homework");
      }

      setStatus(`Generated ${result.count || 0} homework entries`);
      await loadHomework(homeworkYearLevel, homeworkTopic);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate homework");
    } finally {
      setGenerating(false);
    }
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  async function handleFlagForResend(signup: SignupRow) {
    setFlaggingId(signup.id);
    setStatus(`Flagging ${signup.email} for resend...`);
    try {
      const response = await fetch("/api/admin/flag-resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signup.email,
          date: new Date().toISOString().slice(0, 10),
          reason: "Flagged from admin dashboard",
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to flag resend");
      }

      setStatus(`Flagged ${signup.email} for resend`);
      await loadSignups();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to flag resend");
    } finally {
      setFlaggingId(null);
    }
  }

  function renderSortArrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function renderHomeworkSortArrow(key: HomeworkSortKey) {
    if (homeworkSortKey !== key) return "";
    return homeworkSortDirection === "asc" ? " ↑" : " ↓";
  }

  function handleHomeworkSort(nextKey: HomeworkSortKey) {
    if (homeworkSortKey === nextKey) {
      setHomeworkSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setHomeworkSortKey(nextKey);
    setHomeworkSortDirection("asc");
  }

  function handleHomeworkYearChange(nextYearLevel: string) {
    setHomeworkYearLevel(nextYearLevel);
    void loadHomework(nextYearLevel, homeworkTopic);
  }

  function handleHomeworkTopicChange(nextTopic: HomeworkTopic) {
    setHomeworkTopic(nextTopic);
    void loadHomework(homeworkYearLevel, nextTopic);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="text-3xl font-black text-slate-900">Homework admin dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Review signups, flag resends, and trigger resend processing.</p>
        </div>
        <div className="flex items-center gap-3">
          {sessionLoading ? null : isAuthorized && session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name || "User avatar"} className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                  {(session.user.name || session.user.email || "A").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/admin" })}
                className="rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signIn("google", { callbackUrl: "/admin" })}
              className="rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {isAuthorized ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <strong className="text-lg font-semibold text-slate-900">Signups</strong>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{status}</span>
                <button
                  type="button"
                  onClick={handleProcessResends}
                  disabled={processing}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? "Processing..." : "Process pending resends"}
                </button>
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Loading signups...</p>
            ) : signups.length === 0 ? (
              <p className="text-sm text-slate-500">No signups found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("child_name")} className="font-semibold">Child{renderSortArrow("child_name")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("parent_name")} className="font-semibold">Parent{renderSortArrow("parent_name")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("email")} className="font-semibold">Email{renderSortArrow("email")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("year_level")} className="font-semibold">Year{renderSortArrow("year_level")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("days")} className="font-semibold">Days{renderSortArrow("days")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("resend")} className="font-semibold">Resend{renderSortArrow("resend")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("resend_reason")} className="font-semibold">Reason{renderSortArrow("resend_reason")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleSort("created_at")} className="font-semibold">Created{renderSortArrow("created_at")}</button></th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSignups.map((signup) => (
                      <tr key={signup.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-slate-900">{signup.child_name}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.parent_name}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.email}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.year_level}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.days || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.resend ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-slate-700">{signup.resend_reason || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{new Date(signup.created_at).toLocaleDateString("en-NZ")}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void handleFlagForResend(signup)}
                            disabled={flaggingId === signup.id}
                            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {flaggingId === signup.id ? "Flagging..." : "Flag resend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-lg font-semibold text-slate-900">Weekly homework</strong>
                <p className="text-sm text-slate-500">Showing Year {homeworkYearLevel} homework for the selected topic.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  Year
                  <select
                    value={homeworkYearLevel}
                    onChange={(event) => handleHomeworkYearChange(event.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((year) => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  Topic
                  <select
                    value={homeworkTopic}
                    onChange={(event) => handleHomeworkTopicChange(event.target.value as HomeworkTopic)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="all">All topics</option>
                    <option value="maths">Maths</option>
                    <option value="reading">Reading</option>
                    <option value="writing">Writing</option>
                    <option value="grammar">Grammar</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void handleGenerateHomework()}
                  disabled={generating}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? "Generating..." : "Generate homework"}
                </button>
              </div>
            </div>

            {homeworkLoading ? (
              <p className="text-sm text-slate-500">Loading homework...</p>
            ) : homework.length === 0 ? (
              <p className="text-sm text-slate-500">No homework has been generated for this week yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="px-3 py-2"><button type="button" onClick={() => handleHomeworkSort("date")} className="font-semibold">Date{renderHomeworkSortArrow("date")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleHomeworkSort("year_level")} className="font-semibold">Year{renderHomeworkSortArrow("year_level")}</button></th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleHomeworkSort("day")} className="font-semibold">Day{renderHomeworkSortArrow("day")}</button></th>
                      <th className="px-3 py-2">Questions</th>
                      <th className="px-3 py-2"><button type="button" onClick={() => handleHomeworkSort("generated_at")} className="font-semibold">Generated{renderHomeworkSortArrow("generated_at")}</button></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHomework.map((entry) => (
                      <tr key={`${entry.date}-${entry.year_level}`} className="border-b border-slate-100 last:border-0 align-top">
                        <td className="px-3 py-2 font-medium text-slate-900">{entry.date}</td>
                        <td className="px-3 py-2 text-slate-700">{entry.year_level}</td>
                        <td className="px-3 py-2 text-slate-700">{entry.day || "—"}</td>
                        <td className="px-3 py-2 text-slate-700 whitespace-pre-wrap">
                          {formatHomeworkQuestions(entry, homeworkTopic)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{new Date(entry.generated_at).toLocaleString("en-NZ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Sign in required</h2>
          <p className="mt-2 text-sm text-slate-600">Use your Google admin account to view signups and process resends.</p>
        </div>
      )}
    </main>
  );
}

function compareRows(a: SignupRow, b: SignupRow, key: SortKey, direction: "asc" | "desc") {
  const directionFactor = direction === "asc" ? 1 : -1;
  const aValue = a[key];
  const bValue = b[key];

  if (typeof aValue === "boolean" && typeof bValue === "boolean") {
    if (aValue === bValue) return 0;
    return (aValue ? 1 : -1) * directionFactor;
  }

  if (key === "created_at") {
    const aTime = new Date(String(aValue || "")).getTime();
    const bTime = new Date(String(bValue || "")).getTime();
    return (aTime - bTime) * directionFactor;
  }

  const aText = String(aValue || "").toLowerCase();
  const bText = String(bValue || "").toLowerCase();
  return aText.localeCompare(bText) * directionFactor;
}

function compareHomeworkRows(a: HomeworkRow, b: HomeworkRow, key: HomeworkSortKey, direction: "asc" | "desc") {
  const directionFactor = direction === "asc" ? 1 : -1;
  const aValue = a[key];
  const bValue = b[key];

  if (key === "generated_at") {
    return (new Date(String(aValue || "")).getTime() - new Date(String(bValue || "")).getTime()) * directionFactor;
  }

  const aText = String(aValue || "").toLowerCase();
  const bText = String(bValue || "").toLowerCase();
  return aText.localeCompare(bText) * directionFactor;
}

function formatHomeworkQuestions(entry: HomeworkRow, topic: HomeworkTopic) {
  const formatList = (items: string[] | null | undefined) => {
    const values = (items || []).map((item) => String(item).trim()).filter(Boolean);
    return values.length > 0 ? values.map((item, index) => `${index + 1}. ${item}`).join("\n") : "—";
  };

  switch (topic) {
    case "maths":
      return `${entry.maths_topic || "Maths"}\n${formatList(entry.maths_questions)}`;
    case "reading":
      return `${entry.reading_title || "Reading"}\n${formatList(entry.reading_questions)}`;
    case "writing":
      return `${entry.writing_type || "Writing"}\n${entry.writing_prompt || "—"}`;
    case "grammar":
      return `${entry.grammar_topic || "Grammar"}\n${entry.grammar_exercise || "—"}`;
    case "all":
    default:
      return [
        `Maths:\n${formatList(entry.maths_questions)}`,
        `Reading:\n${formatList(entry.reading_questions)}`,
        `Writing:\n${entry.writing_prompt || "—"}`,
        `Grammar:\n${entry.grammar_exercise || "—"}`,
      ].join("\n\n");
  }
}
