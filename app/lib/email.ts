import nodemailer from "nodemailer";

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
  provider: "brevo" | "gmail";
}

type MailProvider = "brevo" | "gmail";

function escapeDisplayName(value: string) {
  return value.replace(/"/g, "").trim();
}

function buildFromAddress(baseAddress: string) {
  const fromName = process.env.FROM_NAME?.trim();
  if (!fromName) return baseAddress;
  return `"${escapeDisplayName(fromName)}" <${baseAddress}>`;
}

function getConfiguredProvider(): MailProvider {
  const configuredProvider = process.env.MAIL_PROVIDER?.toLowerCase();
  return configuredProvider === "gmail" ? "gmail" : "brevo";
}

async function sendWithGmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const gmailUser = process.env.GMAIL_USER || process.env.FROM_EMAIL;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be configured");
  }

  const rawFromAddress = options.from || process.env.FROM_EMAIL || gmailUser;
  const fromAddress = buildFromAddress(rawFromAddress);
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

async function sendWithBrevo(options: EmailSendOptions): Promise<EmailSendResult> {
  const login = process.env.BREVO_SMTP_LOGIN;
  const key = process.env.BREVO_SMTP_KEY;

  if (!login || !key) {
    throw new Error("BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be configured");
  }

  const rawFromAddress = options.from || process.env.FROM_EMAIL;
  if (!rawFromAddress) {
    throw new Error("FROM_EMAIL is not configured");
  }
  const fromAddress = buildFromAddress(rawFromAddress);

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: login,
      pass: key,
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
    provider: "brevo",
  };
}

export async function sendHomeworkEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  const provider = getConfiguredProvider();

  if (provider === "brevo") {
    return sendWithBrevo(options);
  }

  return sendWithGmail(options);
}

export default sendHomeworkEmail;
