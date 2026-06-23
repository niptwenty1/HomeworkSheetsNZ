"use client";

import Image from "next/image";
import { FormEvent, useId, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Check,
  GraduationCap,
  Heart,
  ListChecks,
  Mail,
  Minus,
  PencilLine,
  Sparkles,
  UserRound,
} from "lucide-react";

const worries = [
  "Googling what to teach",
  "Guessing what matters",
  "Downloading random worksheets",
  "Wondering if your child is behind",
];

const weekItems = [
  { label: "Reading comprehension", icon: BookOpenText, tone: "bg-[#f8d8b0]" },
  { label: "Math and Word Problems", icon: Sparkles, tone: "bg-[#a9d8d0]" },
  { label: "Writing topics", icon: PencilLine, tone: "bg-[#eea38c]" },
  { label: "Grammar practice", icon: ListChecks, tone: "bg-[#f5c666]" },
];

function HomeworkSignupForm() {
  const parentNameId = useId();
  const childNameId = useId();
  const yearLevelId = useId();
  const emailId = useId();
  const referrerNameId = useId();
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [email, setEmail] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanParentName = parentName.trim();
    const cleanName = childName.trim();
    const cleanEmail = email.trim();
    const cleanReferrerName = referrerName.trim();

    if (!cleanParentName) {
      setSubmitted(false);
      setError("Add your name so we know who the signup is for.");
      return;
    }

    if (!cleanName) {
      setSubmitted(false);
      setError("Add your child's name so we can personalise the first homework pack.");
      return;
    }

    if (!yearLevel) {
      setSubmitted(false);
      setError("Choose your child's year level.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmitted(false);
      setError("Enter the email address you want the homework sent to.");
      return;
    }

    // if (!cleanReferrerName) {
    //   setSubmitted(false);
    //   setError("Add the referrer's name.");
    //   return;
    // }

    setIsSubmitting(true);
    setError("");
    setSubmitted(false);

    try {
      const response = await fetch("/api/homework-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentName: cleanParentName,
          childName: cleanName,
          yearLevel,
          email: cleanEmail,
          referrerName: cleanReferrerName,
        }),
      });

      if (!response.ok) {
        throw new Error("Signup request failed");
      }

      setParentName("");
      setChildName("");
      setYearLevel("");
      setEmail("");
      setReferrerName("");
      setSubmitted(true);
      setShowSuccessDialog(true);
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left" noValidate>
      <div>
        <label
          htmlFor={parentNameId}
          className="mb-2 block text-sm font-black text-[#6d6255]"
        >
          Parent&apos;s name
        </label>
        <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
          <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
            <UserRound className="h-5 w-5 flex-none text-[#8d7c6b]" />
            <input
              id={parentNameId}
              type="text"
              value={parentName}
              onChange={(event) => {
                setParentName(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Your name"
              className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
              autoComplete="name"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={childNameId}
            className="mb-2 block text-sm font-black text-[#6d6255]"
          >
            Child&apos;s name
          </label>
          <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
            <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
              <UserRound className="h-5 w-5 flex-none text-[#8d7c6b]" />
              <input
                id={childNameId}
                type="text"
                value={childName}
                onChange={(event) => {
                  setChildName(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                placeholder="e.g. Mia"
                className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                autoComplete="given-name"
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor={yearLevelId}
            className="mb-2 block text-sm font-black text-[#6d6255]"
          >
            Child&apos;s year
          </label>
          <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
            <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
              <GraduationCap className="h-5 w-5 flex-none text-[#8d7c6b]" />
              <select
                id={yearLevelId}
                value={yearLevel}
                onChange={(event) => {
                  setYearLevel(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none"
              >
                <option value="">Choose year</option>
                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={emailId}
          className="mb-2 block text-sm font-black text-[#6d6255]"
        >
          Where should we send it?
        </label>
        <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
          <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
            <Mail className="h-5 w-5 flex-none text-[#8d7c6b]" />
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) {
                  setError("");
                }
              }}
              placeholder="Your best email address"
              className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
              autoComplete="email"
              aria-describedby={`${emailId}-message`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">

        <div>
          <label
            htmlFor={referrerNameId}
            className="mb-2 block text-sm font-black text-[#6d6255]"
          >
            Referrer&apos;s name
          </label>
          <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
            <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
              <PencilLine className="h-5 w-5 flex-none text-[#8d7c6b]" />
              <input
                id={referrerNameId}
                type="text"
                value={referrerName}
                onChange={(event) => {
                  setReferrerName(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Name of the person who referred you"
                className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="tactile-button tactile-button-mint inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#a9d8d0] px-5 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#eea38c]/60"
      >
        {isSubmitting ? "Sending details..." : "Get Worksheets Now"}
        <ArrowRight className="h-5 w-5" />
      </button>

      <p
        id={`${emailId}-message`}
        className={`min-h-6 text-center text-sm font-semibold ${
          error ? "text-[#a13d34]" : "text-[#4d776f]"
        }`}
        aria-live="polite"
      >
        {error ||
          (submitted ? "Signup received. We will be in touch soon." : "Takes less than a minute. No payment needed.")}
      </p>
      {showSuccessDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2722]/35 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-success-title"
        >
          <div className="tactile-panel w-full max-w-md rounded-[2rem] p-6 text-center shadow-tactile sm:p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#a9d8d0] shadow-mint">
              <Check className="h-7 w-7 text-[#2a2722]" />
            </div>
            <h3
              id="signup-success-title"
              className="text-3xl font-black leading-tight tracking-tight text-[#2a2722]"
            >
              You&apos;re all set.
            </h3>
            <p className="mt-4 text-base font-medium leading-7 text-[#6d6255]">
              Thanks for signing up. Once your child&apos;s worksheet setup is
              complete, you&apos;ll start receiving homework emails at the
              address you provided.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccessDialog(false)}
              className="tactile-button mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-[1.35rem] bg-[#eea38c] px-5 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a9d8d0]/70"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function SectionIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-3xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-4xl">
        {title}
      </h2>
      {children ? <div className="text-base leading-7 text-[#6d6255]">{children}</div> : null}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-[-4rem] top-28 h-44 w-44 rounded-full bg-[#eea38c]/28 blur-3xl" />
      <div className="pointer-events-none absolute right-[-5rem] top-[34rem] h-48 w-48 rounded-full bg-[#a9d8d0]/45 blur-3xl" />

      <section id="top" className="px-4 pb-12 pt-4 sm:px-6 sm:pb-16 lg:pt-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff8eb]/86 px-4 py-2 text-sm font-black text-[#6d6255] shadow-tactile">
              <CalendarDays className="h-4 w-4 text-[#d68972]" />
              Worksheets for NZ students
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-[#2a2722] sm:text-6xl lg:text-7xl">
                Stop wondering what your child should be learning at home.
              </h1>
              <p className="text-lg font-medium leading-8 text-[#6d6255] sm:text-xl">
                NZ curriculum-aligned worksheets delivered straight to your inbox, helping your child build confidence through consistent practice without adding to your mental load.
              </p>
            </div>

            <div className="tactile-panel rounded-[2rem] p-4 sm:max-w-md">
              <a
                href="#homework-signup"
                className="tactile-button inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[#eea38c] px-5 pb-4 pt-3 text-base font-black text-[#2a2722] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a9d8d0]/70"
              >
                Get Worksheets Now
                <ArrowRight className="h-5 w-5" />
              </a>
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#6d6255]">
                <Check className="h-4 w-4 text-[#4d776f]" />
                20-30 minutes a day. No planning required.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-3 top-2 z-10 h-16 w-16 rounded-full bg-[#a9d8d0] shadow-mint soft-inset sm:h-20 sm:w-20" />
            <div className="absolute -bottom-4 left-2 z-10 h-12 w-12 rounded-full bg-[#eea38c] shadow-button soft-inset sm:h-16 sm:w-16" />
            <div className="tactile-panel relative overflow-hidden rounded-[2.1rem] p-3">
              <Image
                src="/homework-app-preview.png"
                alt="Soft tactile 3D preview of worksheet practice cards"
                width={1024}
                height={1024}
                priority
                className="aspect-[4/5] w-full rounded-[1.55rem] object-cover sm:aspect-[5/4] lg:aspect-[1/1]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="tactile-panel rounded-[2rem] p-5 sm:p-8 lg:grid lg:grid-cols-[0.88fr_1.12fr] lg:gap-8">
            <SectionIntro title="Less stress. More clarity.">
              <p>
                Get a simple weekly plan with focused learning activities tailored
                to your child&apos;s year level.
              </p>
            </SectionIntro>

            <div className="grid gap-3">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#8d7c6b]">
                No more
              </p>
              {worries.map((worry) => (
                <div
                  key={worry}
                  className="flex items-center gap-3 rounded-[1.25rem] bg-white/62 px-4 py-4 shadow-tactile"
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#f8d8b0]">
                    <Minus className="h-4 w-4 text-[#2a2722]" />
                  </span>
                  <p className="font-bold leading-6 text-[#4d463e]">{worry}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <SectionIntro title="How it works" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Choose your child's year level",
              "Receive 3 worksheets a week",
              "Spend 20-30 focused minutes a day",
            ].map((step, index) => (
              <article key={step} className="tactile-panel rounded-[1.75rem] p-5">
                <div className="mb-8 flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#f5c666] text-2xl font-black shadow-button">
                    {index + 1}
                  </span>
                  <span className="h-5 w-5 rounded-full bg-[#a9d8d0] shadow-mint" />
                </div>
                <h3 className="text-xl font-black leading-tight text-[#2a2722]">
                  {step}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="tactile-panel rounded-[2rem] p-5 sm:p-8">
            <SectionIntro title="What the worksheet provides">
              <p>Consistent, disciplined practice.</p>
            </SectionIntro>
            <div className="grid gap-3 sm:grid-cols-2">
              {weekItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[1.35rem] bg-white/64 p-3 shadow-tactile"
                  >
                    <span
                      className={`flex h-12 w-12 flex-none items-center justify-center rounded-[1rem] ${item.tone} soft-inset`}
                    >
                      <Icon className="h-5 w-5 text-[#2a2722]" />
                    </span>
                    <p className="font-black text-[#3f382f]">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#eea38c] shadow-button">
            <Heart className="h-7 w-7 text-[#2a2722]" />
          </div>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-5xl">
            Because parents already carry enough.
          </h2>
          <div className="mx-auto mt-5 max-w-2xl space-y-4 text-lg font-medium leading-8 text-[#6d6255]">
            <p>This isn&apos;t about doing more.</p>
            <p>
              It&apos;s about removing the stress of figuring out what your child
              should focus on each week.
            </p>
          </div>
        </div>
      </section>

      <section id="homework-signup" className="scroll-mt-8 px-4 pb-16 pt-10 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="tactile-panel rounded-[2.2rem] p-5 text-center sm:p-8">
            <div className="mx-auto mb-5 h-4 w-28 rounded-full bg-[#a9d8d0] shadow-mint" />
            <h2 className="text-4xl font-black leading-tight tracking-tight text-[#2a2722] sm:text-5xl">
              Built for busy NZ parents.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-[#6d6255] sm:text-lg">
              You come home from work and your kids are already sitting down
              with focused practice. Join other parents looking for a calmer way
              to support learning at home.
            </p>
            <div className="mx-auto mt-6 max-w-2xl rounded-[1.75rem] bg-white/36 p-3 shadow-tactile">
              <HomeworkSignupForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
