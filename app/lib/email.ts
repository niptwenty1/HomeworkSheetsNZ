import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendWithResend({
  to,
  subject,
  html,
  from,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const fromAddress = from || process.env.FROM_EMAIL;
  if (!fromAddress) {
    throw new Error("FROM_EMAIL is not configured");
  }

  const payload = {
    from: fromAddress,
    to,
    subject,
    html,
    reply_to: replyTo,
  };

  const response = await resend.emails.send(payload);

  return {
    ok: !response.error,
    status: response.error ? 400 : 200,
    body: response,
  };
}

export default sendWithResend;
