"use client";

import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw, X } from "lucide-react";

type HomeworkEntry = {
  id: number;
  date: string;
  day: string | null;
  maths_topic: string | null;
  maths_instructions: string | null;
  maths_questions: string[] | null;
  maths_word_problem: string | null;
  reading_title: string | null;
  reading_text: string | null;
  reading_questions: string[] | null;
  writing_type: string | null;
  writing_prompt: string | null;
  writing_word_count: string | null;
  grammar_topic: string | null;
  grammar_instruction: string | null;
  grammar_exercise: string | null;
  year_level: string;
};

type HomeworkFormState = {
  maths_topic: string;
  maths_instructions: string;
  maths_questions: string;
  maths_word_problem: string;
  reading_title: string;
  reading_text: string;
  reading_questions: string;
  writing_type: string;
  writing_prompt: string;
  writing_word_count: string;
  grammar_topic: string;
  grammar_instruction: string;
  grammar_exercise: string;
};

const years = Array.from({ length: 10 }, (_, index) => String(index + 1));

function formatDate(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short", year: "numeric" }) : "No date";
}

function toFormState(entry: HomeworkEntry): HomeworkFormState {
  return {
    maths_topic: entry.maths_topic || "",
    maths_instructions: entry.maths_instructions || "",
    maths_questions: (entry.maths_questions || []).join("\n"),
    maths_word_problem: entry.maths_word_problem || "",
    reading_title: entry.reading_title || "",
    reading_text: entry.reading_text || "",
    reading_questions: (entry.reading_questions || []).join("\n"),
    writing_type: entry.writing_type || "",
    writing_prompt: entry.writing_prompt || "",
    writing_word_count: entry.writing_word_count || "",
    grammar_topic: entry.grammar_topic || "",
    grammar_instruction: entry.grammar_instruction || "",
    grammar_exercise: entry.grammar_exercise || "",
  };
}

export default function HomeworkManager() {
  const [yearLevel, setYearLevel] = useState("6");
  const [homework, setHomework] = useState<HomeworkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HomeworkEntry | null>(null);
  const [form, setForm] = useState<HomeworkFormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadHomework(yearLevel);
  }, [yearLevel]);

  async function loadHomework(year: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/homework?yearLevel=${encodeURIComponent(year)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load homework");
      setHomework(result.homework || []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load homework");
    } finally {
      setLoading(false);
    }
  }

  function openEntry(entry: HomeworkEntry) {
    setSelectedEntry(entry);
    setForm(toFormState(entry));
  }

  function closeEntry() {
    setSelectedEntry(null);
    setForm(null);
  }

  function updateField(field: keyof HomeworkFormState, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveEntry() {
    if (!selectedEntry || !form) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/homework/${selectedEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maths_questions: form.maths_questions.split("\n").map((line) => line.trim()).filter(Boolean),
          reading_questions: form.reading_questions.split("\n").map((line) => line.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save homework");
      setHomework((current) => current.map((entry) => (entry.id === result.homework.id ? result.homework : entry)));
      setStatus("Homework updated");
      closeEntry();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save homework");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6d6255]">HomeWork Sheets</p>
            <h1 className="text-xl font-black">This week&apos;s homework</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={yearLevel} onChange={(event) => setYearLevel(event.target.value)} className="rounded-xl border-0 bg-[#fff8eb] px-3 py-2.5 text-sm font-bold outline-none">
              {years.map((value) => <option key={value} value={value}>Year {value}</option>)}
            </select>
            <button type="button" onClick={() => void loadHomework(yearLevel)} className="rounded-xl bg-[#fff8eb] p-3 shadow-tactile" aria-label="Refresh homework" title="Refresh homework"><RefreshCw size={17} /></button>
          </div>
        </header>

        {status && <p className="mb-5 rounded-xl bg-[#f5c666]/25 px-3 py-2 text-sm font-semibold">{status}</p>}

        <section className="tactile-panel rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Year {yearLevel} homework</h2>
              <p className="text-sm text-[#6d6255]">Select a day to edit its maths, reading, writing and grammar content.</p>
            </div>
            <span className="rounded-full bg-[#a9d8d0]/50 px-3 py-1 text-xs font-black">{homework.length} day{homework.length === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#d9cdbd]">
                <tr className="text-xs uppercase tracking-[0.12em] text-[#6d6255]">
                  <th className="pb-3 font-bold">Day</th>
                  <th className="pb-3 font-bold">Maths</th>
                  <th className="pb-3 font-bold">Reading</th>
                  <th className="pb-3 font-bold">Writing</th>
                  <th className="pb-3 font-bold">Grammar</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#6d6255]">Loading homework...</td></tr>
                ) : homework.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#6d6255]">No homework generated for this year level this week.</td></tr>
                ) : homework.map((entry) => (
                  <tr key={entry.id} onClick={() => openEntry(entry)} className="cursor-pointer border-b border-[#eadfce] last:border-0 hover:bg-[#fff8eb]/60">
                    <td className="py-4 font-black">{formatDate(entry.date)}</td>
                    <td className="py-4">{entry.maths_topic || "-"}</td>
                    <td className="py-4">{entry.reading_title || "-"}</td>
                    <td className="py-4">{entry.writing_type || "-"}</td>
                    <td className="py-4">{entry.grammar_topic || "-"}</td>
                    <td className="py-4 text-right"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedEntry && form && (
        <div className="fixed inset-0 z-50 bg-[#2a2722]/25 p-3 sm:p-6">
          <section className="tactile-panel ml-auto flex h-full w-full max-w-2xl flex-col rounded-[28px] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#d68972]">Year {selectedEntry.year_level} homework</p>
                <h2 className="text-2xl font-black">{formatDate(selectedEntry.date)}</h2>
              </div>
              <button type="button" onClick={closeEntry} className="rounded-xl bg-[#fff8eb] p-2.5 shadow-tactile" aria-label="Close editor" title="Close"><X size={19} /></button>
            </div>

            <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Maths</legend>
                <label className="block text-xs font-bold">Topic<input value={form.maths_topic} onChange={(event) => updateField("maths_topic", event.target.value)} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Instructions<textarea value={form.maths_instructions} onChange={(event) => updateField("maths_instructions", event.target.value)} rows={2} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Questions (one per line)<textarea value={form.maths_questions} onChange={(event) => updateField("maths_questions", event.target.value)} rows={5} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Word problem<textarea value={form.maths_word_problem} onChange={(event) => updateField("maths_word_problem", event.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Reading</legend>
                <label className="block text-xs font-bold">Title<input value={form.reading_title} onChange={(event) => updateField("reading_title", event.target.value)} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Passage<textarea value={form.reading_text} onChange={(event) => updateField("reading_text", event.target.value)} rows={6} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Questions (one per line)<textarea value={form.reading_questions} onChange={(event) => updateField("reading_questions", event.target.value)} rows={4} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Writing</legend>
                <label className="block text-xs font-bold">Type<input value={form.writing_type} onChange={(event) => updateField("writing_type", event.target.value)} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Prompt<textarea value={form.writing_prompt} onChange={(event) => updateField("writing_prompt", event.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Word count<input value={form.writing_word_count} onChange={(event) => updateField("writing_word_count", event.target.value)} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Grammar</legend>
                <label className="block text-xs font-bold">Topic<input value={form.grammar_topic} onChange={(event) => updateField("grammar_topic", event.target.value)} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Instruction<textarea value={form.grammar_instruction} onChange={(event) => updateField("grammar_instruction", event.target.value)} rows={2} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
                <label className="block text-xs font-bold">Exercise<textarea value={form.grammar_exercise} onChange={(event) => updateField("grammar_exercise", event.target.value)} rows={4} className="mt-1 w-full rounded-xl bg-[#fff8eb] px-3 py-2 text-sm outline-none" /></label>
              </fieldset>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeEntry} className="rounded-xl bg-[#fff8eb] px-4 py-2.5 text-sm font-bold shadow-tactile">Cancel</button>
              <button type="button" onClick={() => void saveEntry()} disabled={saving} className="tactile-button-mint rounded-2xl bg-[#a9d8d0] px-5 py-2.5 text-sm font-black disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
