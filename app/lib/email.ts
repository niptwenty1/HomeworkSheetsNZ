import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  ok: boolean;
  status: number;
  body: unknown;
  provider: "gmail" | "resend";
}

type MailProvider = "gmail" | "resend";

function getConfiguredProvider(): MailProvider {
  const configuredProvider = process.env.MAIL_PROVIDER?.toLowerCase();
  return configuredProvider === "resend" ? "resend" : "gmail";
}

async function sendWithGmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const gmailUser = process.env.GMAIL_USER || process.env.FROM_EMAIL;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be configured");
  }

  const fromAddress = options.from || process.env.FROM_EMAIL || gmailUser;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const info = await transporter.sendMail({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo || process.env.REPLY_TO_EMAIL || undefined,
  });

  return {
    ok: true,
    status: 200,
    body: {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    },
    provider: "gmail",
  };
}

async function sendWithResendProvider(options: EmailSendOptions): Promise<EmailSendResult> {
  const resend = new Resend(process.env.RESEND_API_KEY || "");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const fromAddress = options.from || process.env.FROM_EMAIL;
  if (!fromAddress) {
    throw new Error("FROM_EMAIL is not configured");
  }

  const payload = {
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    reply_to: options.replyTo,
  };

  const response = await resend.emails.send(payload);

  return {
    ok: !response.error,
    status: response.error ? 400 : 200,
    body: response,
    provider: "resend",
  };
}

export async function sendHomeworkEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const provider = getConfiguredProvider();

  if (provider === "resend") {
    return sendWithResendProvider(options);
  }

  return sendWithGmail(options);
}

export default sendHomeworkEmail;
