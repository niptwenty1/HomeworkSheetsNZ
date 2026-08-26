import Link from "next/link";

export default function EmailVerifiedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#4d776f]">Email verified</p>
        <h1 className="mt-3 text-3xl font-black text-[#2a2722]">You&apos;re all set.</h1>
        <p className="mt-4 text-base leading-7 text-[#6d6255]">
          Your parent email has been verified. You can now receive HomeWorksheets emails.
        </p>
        <Link
          href="/"
          className="tactile-button mt-6 inline-flex min-h-14 items-center justify-center rounded-[1.35rem] bg-[#a9d8d0] px-5 pb-4 pt-3 font-black text-[#2a2722]"
        >
          Return to HomeWorksheets
        </Link>
      </section>
    </main>
  );
}
