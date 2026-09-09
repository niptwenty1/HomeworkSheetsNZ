"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { BookOpen, LayoutDashboard, Menu, NotebookText, X } from "lucide-react";
import AdminWorkspace from "./AdminWorkspace";
import HomeworkManager from "./HomeworkManager";

type SessionUser = { name?: string | null; email?: string | null; image?: string | null };
type AdminView = "dashboard" | "homework";

const navItems: Array<{ id: AdminView; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "homework", label: "Homework", icon: <NotebookText size={18} /> },
];

export default function AdminShell() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AdminView>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const result = await response.json();
        setSession(result?.user || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  if (loading) {
    return <main className="min-h-screen px-4 py-12 text-center text-sm text-[#6d6255]">Loading admin workspace...</main>;
  }

  return (
    <div className="min-h-screen">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="tactile-button fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff8eb] shadow-tactile"
        aria-label="Open menu"
        title="Open menu"
      >
        <Menu size={19} />
      </button>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#2a2722]/25" onClick={() => setMenuOpen(false)}>
          <aside
            className="tactile-panel m-3 flex h-[calc(100vh-1.5rem)] w-56 flex-col gap-2 rounded-[24px] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a9d8d0] text-sm font-black shadow-mint">H</span>
                <span className="text-sm font-black">Admin</span>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="rounded-xl bg-[#fff8eb] p-2 shadow-tactile" aria-label="Close menu" title="Close menu"><X size={17} /></button>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setView(item.id); setMenuOpen(false); }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${view === item.id ? "bg-[#a9d8d0] shadow-mint" : "hover:bg-[#fff8eb]"}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </aside>
        </div>
      )}

      {view === "dashboard" ? <AdminWorkspace /> : <HomeworkManager />}
    </div>
  );
}
