"use client";

import { FormEvent, useId, useState } from "react";
import { Mail, MessageSquareText, Send, UserRound } from "lucide-react";

type ContactResponse = {
  ok?: boolean;
  error?: string;
};

export default function ContactPage() {
  const nameId = useId();
  const studentNameId = useId();
  const emailId = useId();
  const messageId = useId();

  const [name, setName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanStudentName = studentName.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    if (!cleanName) {
      setError("Please enter your name.");
      setSuccessMessage("");
      return;
    }

    if (!cleanStudentName) {
      setError("Please enter the student name.");
      setSuccessMessage("");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      setSuccessMessage("");
      return;
    }

    if (cleanMessage.length < 8) {
      setError("Please add a message so we can help you.");
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          studentName: cleanStudentName,
          email: cleanEmail,
          message: cleanMessage,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as ContactResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Unable to send your message right now.");
      }

      setName("");
      setStudentName("");
      setEmail("");
      setMessage("");
      setSuccessMessage("Thanks for reaching out. We will contact you via email as soon as we can.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="px-4 pb-16 pt-5 sm:px-6">
      <section className="mx-auto max-w-3xl tactile-panel rounded-[2rem] p-6 sm:p-8">
        <div className="mb-6">
          <p className="mb-2 inline-flex rounded-full bg-[#f5c666]/75 px-3 py-1 text-xs font-black tracking-wide text-[#3b3229]">
            Contact Us
          </p>
          <h1 className="m-0 text-3xl font-black tracking-tight text-[#2a2722] sm:text-4xl">
            Need a hand with HomeWork Sheets?
          </h1>
          <p className="mb-0 mt-3 max-w-2xl text-base font-medium text-[#6d6255]">
            Send us a message and our admin team will review it promptly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={nameId} className="mb-2 block text-sm font-black text-[#6d6255]">
              Your name
            </label>
            <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
              <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
                <UserRound className="h-5 w-5 flex-none text-[#8d7c6b]" />
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Parent or caregiver name"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                  autoComplete="name"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={studentNameId} className="mb-2 block text-sm font-black text-[#6d6255]">
              Student name
            </label>
            <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
              <div className="flex min-h-14 items-center gap-2 rounded-[1rem] bg-white/72 px-4">
                <UserRound className="h-5 w-5 flex-none text-[#8d7c6b]" />
                <input
                  id={studentNameId}
                  type="text"
                  value={studentName}
                  onChange={(event) => {
                    setStudentName(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Child's name"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={emailId} className="mb-2 block text-sm font-black text-[#6d6255]">
              Email address
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
                    if (error) setError("");
                  }}
                  placeholder="name@example.com"
                  className="min-w-0 flex-1 bg-transparent py-4 text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={messageId} className="mb-2 block text-sm font-black text-[#6d6255]">
              Message
            </label>
            <div className="soft-inset rounded-[1.35rem] bg-[#fffaf0]/82 p-2">
              <div className="flex items-start gap-2 rounded-[1rem] bg-white/72 px-4 py-3">
                <MessageSquareText className="mt-1 h-5 w-5 flex-none text-[#8d7c6b]" />
                <textarea
                  id={messageId}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    if (error) setError("");
                  }}
                  rows={6}
                  placeholder="Tell us how we can help"
                  className="min-w-0 flex-1 resize-y bg-transparent text-base font-medium text-[#2a2722] outline-none placeholder:text-[#9c8e7d]"
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="m-0 rounded-2xl border border-[#e6b9ae] bg-[#fff3ef] px-4 py-3 text-sm font-semibold text-[#8a2f1e]">
              {error}
            </p>
          ) : null}

          {successMessage ? (
            <p className="m-0 rounded-2xl border border-[#9fd2c9] bg-[#effaf7] px-4 py-3 text-sm font-semibold text-[#1c5a50]">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="tactile-button tactile-button-mint inline-flex items-center gap-2 rounded-2xl bg-[#a9d8d0] px-5 py-3 text-base font-black text-[#2a2722] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </section>
    </main>
  );
}
