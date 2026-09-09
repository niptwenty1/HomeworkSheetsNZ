"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type Student = {
  id: number;
  child_name: string;
  parent_name: string;
  email: string;
  parent_email: string | null;
  year_level: string;
  days: string | null;
  resend: boolean;
  created_at: string;
  activity?: {
    receivedCount: number;
    completedCount: number;
    lastReceivedDate: string | null;
    lastCompletedDate: string | null;
  };
};

type StudentDetail = {
  student: Student;
  summary: NonNullable<Student["activity"]>;
  history: Array<{
    id: number;
    date: string | null;
    status: string | null;
    completed: boolean;
    topics: Array<{ subject: string; topic: string }>;
  }>;
};

type SessionUser = { name?: string | null; email?: string | null; image?: string | null };

const years = Array.from({ length: 10 }, (_, index) => String(index + 1));

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminWorkspace() {
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [showNeedsAttention, setShowNeedsAttention] = useState(false);
  const [learnerPage, setLearnerPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resendDate, setResendDate] = useState(getTodayDateString);
  const [resendStudentIds, setResendStudentIds] = useState<number[]>([]);

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    setLearnerPage(1);
  }, [query, year, showNeedsAttention]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await sessionResponse.json();
      if (!sessionData?.user) {
        setSession(null);
        return;
      }

      setSession(sessionData.user as SessionUser);
      const response = await fetch("/api/admin/signups", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load students");
      setStudents(result.signups || []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function openStudent(student: Student) {
    setSelectedStudent(student);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load student detail");
      setDetail(result as StudentDetail);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load student detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function processResends() {
    const selectedStudents = students.filter((student) => resendStudentIds.includes(student.id));
    if (selectedStudents.length === 0) {
      setStatus("Select at least one learner to process a resend.");
      return;
    }

    setProcessing(true);
    try {
      for (const student of selectedStudents) {
        const flagResponse = await fetch("/api/admin/flag-resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: student.id,
            email: student.email,
            date: resendDate,
            reason: `Selected from admin dashboard for ${resendDate}`,
          }),
        });
        const flagResult = await flagResponse.json();
        if (!flagResponse.ok || !flagResult.ok) {
          throw new Error(flagResult.error || `Unable to queue resend for ${student.child_name}`);
        }
      }

      const response = await fetch("/api/admin/process-resends", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to process resends");
      setStatus(`Processed ${result.processed || 0} resend requests`);
      setResendStudentIds([]);
      await loadDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to process resends");
    } finally {
      setProcessing(false);
    }
  }

  function toggleResendStudent(studentId: number) {
    setResendStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  function toggleAllVisibleStudents() {
    const visibleIds = filteredStudents.map((student) => student.id);
    const areAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => resendStudentIds.includes(id));
    setResendStudentIds((current) => areAllVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  }

  const matchingStudents = students.filter((student) => {
    const matchesYear = year === "all" || student.year_level === year;
    const haystack = `${student.child_name} ${student.parent_name} ${student.email}`.toLowerCase();
    const needsAttention = (student.activity?.receivedCount || 0) > 0 && !student.activity?.lastCompletedDate;
    return matchesYear && haystack.includes(query.toLowerCase()) && (!showNeedsAttention || needsAttention);
  });
  const learnersPerPage = 20;
  const learnerPageCount = Math.max(1, Math.ceil(matchingStudents.length / learnersPerPage));
  const activeLearnerPage = Math.min(learnerPage, learnerPageCount);
  const filteredStudents = matchingStudents.slice(
    (activeLearnerPage - 1) * learnersPerPage,
    activeLearnerPage * learnersPerPage,
  );
  const totalReceived = students.reduce((total, student) => total + (student.activity?.receivedCount || 0), 0);
  const totalCompleted = students.reduce((total, student) => total + (student.activity?.completedCount || 0), 0);
  const completionRate = totalReceived ? Math.round((totalCompleted / totalReceived) * 100) : 0;
  const attentionStudents = students.filter((student) => (student.activity?.receivedCount || 0) > 0 && !student.activity?.lastCompletedDate);
  const needsAttention = attentionStudents.length;

  if (!loading && !session) {
    return (
      <main className="min-h-screen px-4 py-12 sm:px-6">
        <section className="tactile-panel mx-auto max-w-md rounded-[28px] p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a9d8d0] shadow-mint"><BookOpen size={25} /></span>
          <h1 className="mt-5 text-2xl font-black">Admin workspace</h1>
          <p className="mt-2 text-sm text-[#6d6255]">Sign in with an approved account to manage HomeWork Sheets.</p>
          <button type="button" onClick={() => void signIn("google", { callbackUrl: "/admin" })} className="tactile-button mt-7 rounded-2xl bg-[#eea38c] px-5 py-3 text-sm font-black">Sign in with Google</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a9d8d0] text-lg font-black shadow-mint">H</span>
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#6d6255]">HomeWork Sheets</p><h1 className="text-xl font-black">Learning dashboard</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void loadDashboard()} className="rounded-xl bg-[#fff8eb] p-3 shadow-tactile" aria-label="Refresh dashboard" title="Refresh dashboard"><RefreshCw size={17} /></button>
            <div className="hidden text-right sm:block"><p className="text-sm font-black">{session?.name || "Administrator"}</p><p className="text-xs text-[#6d6255]">Admin account</p></div>
            {session?.image ? <img src={session.image} alt="Admin avatar" className="h-10 w-10 rounded-full border-2 border-[#fff8eb] object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eea38c] font-black">{(session?.name || "A").charAt(0)}</span>}
            <button type="button" onClick={() => void signOut({ callbackUrl: "/admin" })} className="text-xs font-bold text-[#6d6255]">Sign out</button>
          </div>
        </header>

        <section className="tactile-panel rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-[#d68972]">Student progress, at a glance</p><h2 className="mt-1 text-3xl font-black sm:text-4xl">Your learning pulse</h2><p className="mt-2 max-w-xl text-sm text-[#6d6255]">Keep an eye on homework delivery, completion, and the learners who could use a follow-up.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="rounded-xl bg-[#fff8eb] px-3 py-2 text-xs font-bold">Homework date <input type="date" value={resendDate} onChange={(event) => setResendDate(event.target.value)} className="ml-2 bg-transparent text-sm outline-none" /></label>
              <button type="button" onClick={() => void processResends()} disabled={processing || resendStudentIds.length === 0} className="tactile-button-mint rounded-2xl bg-[#a9d8d0] px-5 py-3 text-sm font-black disabled:opacity-60"><Send className="mr-2 inline" size={16} />{processing ? "Processing..." : `Process resends${resendStudentIds.length ? ` (${resendStudentIds.length})` : ""}`}</button>
            </div>
          </div>
          {status && <p className="mt-5 rounded-xl bg-[#f5c666]/25 px-3 py-2 text-sm font-semibold">{status}</p>}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Users size={19} />} label="Active learners" value={students.length} note="Signed up for homework" color="bg-[#a9d8d0]" />
          <Metric icon={<Send size={19} />} label="Homework received" value={totalReceived} note="Successful deliveries" color="bg-[#eea38c]" />
          <Metric icon={<CheckCircle2 size={19} />} label="Completion rate" value={`${completionRate}%`} note={`${totalCompleted} marked complete`} color="bg-[#f5c666]" />
          <Metric icon={<Clock3 size={19} />} label="Needs attention" value={needsAttention} note="No completion recorded" color="bg-[#d9e9e2]" onClick={() => setShowNeedsAttention((current) => !current)} active={showNeedsAttention} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="tactile-panel min-w-0 rounded-[26px] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">{showNeedsAttention ? "Needs attention" : "Learners"}</h2><p className="text-sm text-[#6d6255]">{showNeedsAttention ? "Learners who have received homework but have no recorded completion." : "Select a learner to see their homework story."}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#a9d8d0]/50 px-3 py-1 text-xs font-black">{matchingStudents.length} shown</span>{showNeedsAttention && <button type="button" onClick={() => setShowNeedsAttention(false)} className="rounded-lg bg-[#fff8eb] px-3 py-2 text-xs font-bold">Show all</button>}</div></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 rounded-xl bg-[#fff8eb] px-3 py-2.5 shadow-inner"><Search size={17} className="text-[#6d6255]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search learner or parent" className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a9085]" /></label>
              <select value={year} onChange={(event) => setYear(event.target.value)} className="rounded-xl border-0 bg-[#fff8eb] px-3 py-2.5 text-sm font-bold outline-none"><option value="all">All years</option>{years.map((value) => <option key={value} value={value}>Year {value}</option>)}</select>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#6d6255]">
              <span>{matchingStudents.length ? `${(activeLearnerPage - 1) * learnersPerPage + 1}-${Math.min(activeLearnerPage * learnersPerPage, matchingStudents.length)} of ${matchingStudents.length}` : "No matching learners"}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setLearnerPage(activeLearnerPage - 1)} disabled={activeLearnerPage === 1} className="rounded-lg bg-[#fff8eb] px-3 py-2 disabled:opacity-50">Previous</button>
                <span>Page {activeLearnerPage} of {learnerPageCount}</span>
                <button type="button" onClick={() => setLearnerPage(activeLearnerPage + 1)} disabled={activeLearnerPage === learnerPageCount} className="rounded-lg bg-[#fff8eb] px-3 py-2 disabled:opacity-50">Next</button>
              </div>
            </div>
            <style jsx>{`tbody { display: block; max-height: 32rem; overflow-y: auto; } thead, tbody tr { display: table; width: 100%; table-layout: fixed; }`}</style>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm"><thead className="border-b border-[#d9cdbd]"><tr className="text-xs uppercase tracking-[0.12em] text-[#6d6255]"><th className="pb-3 pr-3"><input type="checkbox" checked={filteredStudents.length > 0 && filteredStudents.every((student) => resendStudentIds.includes(student.id))} onChange={toggleAllVisibleStudents} aria-label="Select all visible learners for resend" /></th><th className="pb-3 font-bold">Learner</th><th className="pb-3 font-bold">Year</th><th className="pb-3 font-bold">Received</th><th className="pb-3 font-bold">Completed</th><th className="pb-3 font-bold">Last activity</th><th className="pb-3" /></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="py-8 text-center text-[#6d6255]">Loading learners...</td></tr> : filteredStudents.map((student) => { const activity = student.activity; const received = activity?.receivedCount || 0; const completed = activity?.completedCount || 0; return <tr key={student.id} className="border-b border-[#eadfce] last:border-0"><td className="py-4 pr-3"><input type="checkbox" checked={resendStudentIds.includes(student.id)} onChange={() => toggleResendStudent(student.id)} aria-label={`Select ${student.child_name} for resend`} /></td><td className="py-4"><button type="button" onClick={() => void openStudent(student)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eea38c]/55 font-black">{student.child_name.charAt(0).toUpperCase()}</span><span><span className="block font-black">{student.child_name}</span><span className="block text-xs text-[#6d6255]">{student.parent_name}</span></span></button></td><td className="py-4 font-bold">{student.year_level}</td><td className="py-4 font-bold">{received}</td><td className="py-4"><span className="font-bold">{completed}</span>{received > 0 && <span className="ml-1 text-xs text-[#6d6255]">({Math.round((completed / received) * 100)}%)</span>}</td><td className="py-4 text-xs text-[#6d6255]">{formatDate(activity?.lastCompletedDate || activity?.lastReceivedDate)}</td><td className="py-4 text-right"><button type="button" onClick={() => void openStudent(student)} className="rounded-lg p-2 text-[#2a2722] hover:bg-[#a9d8d0]/45" aria-label={`Open ${student.child_name}`} title="View learner"><ChevronRight size={18} /></button></td></tr>; })}</tbody></table></div>
          </div>

          <aside className="tactile-panel rounded-[26px] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Follow-up</p><h2 className="mt-1 text-lg font-black">Needs a look</h2></div><Sparkles size={20} className="text-[#d68972]" /></div><div className="mt-5 space-y-3">{students.filter((student) => student.resend || ((student.activity?.receivedCount || 0) > 0 && !student.activity?.lastCompletedDate)).slice(0, 5).map((student) => <button type="button" onClick={() => void openStudent(student)} key={student.id} className="flex w-full items-center justify-between rounded-xl bg-[#fff8eb]/80 p-3 text-left transition hover:-translate-y-0.5"><span><span className="block text-sm font-black">{student.child_name}</span><span className="block text-xs text-[#6d6255]">{student.resend ? "Resend requested" : "No completion recorded"}</span></span><ArrowUpRight size={16} /></button>)}{!loading && needsAttention === 0 && <p className="py-8 text-center text-sm text-[#6d6255]">No learners need a follow-up right now.</p>}</div></aside>
        </section>
      </div>

      {selectedStudent && <StudentPanel student={selectedStudent} detail={detail} loading={detailLoading} onClose={() => { setSelectedStudent(null); setDetail(null); }} />}
    </main>
  );
}

function Metric({ icon, label, value, note, color, onClick, active }: { icon: React.ReactNode; label: string; value: number | string; note: string; color: string; onClick?: () => void; active?: boolean }) {
  const content = <><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff8eb]/70">{icon}</span><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 font-black">{label}</p><p className="mt-1 text-xs text-[#6d6255]">{note}</p></>;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={active} className={`${color} rounded-2xl p-5 text-left shadow-tactile transition hover:-translate-y-0.5 ${active ? "ring-2 ring-[#2a2722] ring-offset-2" : ""}`}>{content}</button> : <div className={`${color} rounded-2xl p-5 shadow-tactile`}>{content}</div>;
}

function StudentPanel({ student, detail, loading, onClose }: { student: Student; detail: StudentDetail | null; loading: boolean; onClose: () => void }) {
  const summary = detail?.summary || student.activity;
  const received = summary?.receivedCount || 0;
  const completed = summary?.completedCount || 0;
  const subjectTopics = ["Maths", "Reading", "Writing", "Grammar"].map((subject) => ({
    subject,
    topics: Array.from(new Set((detail?.history || []).flatMap((item) => item.topics.filter((topic) => topic.subject === subject).map((topic) => topic.topic)))),
  }));
  return <div className="fixed inset-0 z-50 bg-[#2a2722]/25 p-3 sm:p-6"><section className="tactile-panel ml-auto flex h-full w-full max-w-2xl flex-col rounded-[28px] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eea38c] text-xl font-black">{student.child_name.charAt(0).toUpperCase()}</span><div><p className="text-xs font-bold text-[#d68972]">Year {student.year_level} learner</p><h2 className="text-2xl font-black">{student.child_name}</h2></div></div><button type="button" onClick={onClose} className="rounded-xl bg-[#fff8eb] p-2.5 shadow-tactile" aria-label="Close learner detail" title="Close"><X size={19} /></button></div><div className="mt-5 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff8eb] px-3 py-2 font-bold"><Mail size={15} />{student.parent_name}</span><span className="rounded-lg bg-[#fff8eb] px-3 py-2 font-bold">{student.days || "Delivery days not set"}</span></div><div className="mt-6 grid grid-cols-3 gap-3"><SmallMetric label="Received" value={received} /><SmallMetric label="Completed" value={completed} /><SmallMetric label="Progress" value={received ? `${Math.round((completed / received) * 100)}%` : "-"} /></div><div className="mt-7 min-h-0 flex-1 overflow-y-auto"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#d68972]">Homework history</p><h3 className="mt-1 text-lg font-black">Learning record</h3></div><BookOpen size={20} /></div>{loading ? <p className="py-12 text-center text-sm text-[#6d6255]">Loading homework history...</p> : detail?.history.length ? <div className="mt-4 space-y-4">{subjectTopics.map((group) => group.topics.length ? <div key={group.subject}><p className="text-xs font-black uppercase tracking-[0.12em] text-[#6d6255]">{group.subject}</p><div className="mt-2 flex flex-wrap gap-2">{group.topics.map((topic) => <span key={topic} className="rounded-lg border border-[#d9cdbd] bg-white/55 px-2 py-1 text-xs">{topic}</span>)}</div></div> : null)}{subjectTopics.every((group) => group.topics.length === 0) && <p className="text-xs text-[#6d6255]">Topic snapshot unavailable for these deliveries.</p>}</div> : <p className="py-12 text-center text-sm text-[#6d6255]">No successful homework deliveries recorded yet.</p>}</div></section></div>;
}

function SmallMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-[#fff8eb] p-3"><p className="text-xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-[#6d6255]">{label}</p></div>; }
function formatDate(value: string | null | undefined) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "No activity yet"; }
