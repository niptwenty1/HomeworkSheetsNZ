"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const isSpyAcademy = pathname === "/spy-academy";
  const isHome = pathname === "/";
  const baseButtonClass =
    "rounded-2xl px-3 py-3 text-sm font-black text-[#2a2722] shadow-tactile transition hover:-translate-y-0.5 active:translate-y-1 sm:px-4";
  const idleButtonClass = "bg-[#fff8eb]/82";
  const activeButtonClass = "bg-[#a9d8d0] shadow-mint";

  return (
    <header className="px-4 pb-4 pt-5 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="HomeWork Sheets home">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#a9d8d0] text-lg font-black text-[#2a2722] shadow-mint">
            H
          </span>
          <span className="truncate text-base font-black tracking-tight text-[#2a2722]">
            HomeWork Sheets
          </span>
        </Link>

        <div className="flex flex-none items-center gap-2">
          <Link
            href="/spy-academy"
            aria-current={isSpyAcademy ? "page" : undefined}
            className={`${baseButtonClass} ${isSpyAcademy ? activeButtonClass : idleButtonClass}`}
          >
            Holiday Activity
          </Link>
          <Link
            href="/#homework-signup"
            aria-current={isHome ? "page" : undefined}
            className={`${baseButtonClass} ${isHome ? activeButtonClass : idleButtonClass}`}
          >
            {isSpyAcademy ? "Homework" : "Sign up"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
