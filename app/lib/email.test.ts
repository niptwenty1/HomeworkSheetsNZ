import nodemailer from "nodemailer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendHomeworkEmail } from "./email";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

const mockedCreateTransport = vi.mocked(nodemailer.createTransport);
const originalEnv = { ...process.env };

afterEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
});

describe("sendHomeworkEmail", () => {
  it("uses Brevo SMTP by default", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "brevo-message-id",
      accepted: ["student@example.com"],
      rejected: [],
    });
    mockedCreateTransport.mockReturnValue({ sendMail } as never);
    process.env.BREVO_SMTP_LOGIN = "brevo-login";
    process.env.BREVO_SMTP_KEY = "brevo-key";
    process.env.FROM_EMAIL = "homework@homeworksheets.co.nz";
    process.env.FROM_NAME = "HomeWorksheets";
    process.env.REPLY_TO_EMAIL = "support@homeworksheets.co.nz";
    delete process.env.MAIL_PROVIDER;

    const result = await sendHomeworkEmail({
      to: "student@example.com",
      subject: "Homework",
      html: "<p>Homework</p>",
    });

    expect(mockedCreateTransport).toHaveBeenCalledWith({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: "brevo-login", pass: "brevo-key" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: '"HomeWorksheets" <homework@homeworksheets.co.nz>',
      to: "student@example.com",
      subject: "Homework",
      html: "<p>Homework</p>",
      replyTo: "support@homeworksheets.co.nz",
    });
    expect(result).toMatchObject({ ok: true, provider: "brevo", status: 200 });
  });

  it("requires Brevo credentials", async () => {
    delete process.env.BREVO_SMTP_LOGIN;
    delete process.env.BREVO_SMTP_KEY;
    delete process.env.MAIL_PROVIDER;

    await expect(
      sendHomeworkEmail({ to: "student@example.com", subject: "Homework", html: "<p>Homework</p>" }),
    ).rejects.toThrow("BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must be configured");
  });

  it("uses Gmail only when explicitly selected", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "gmail-message-id",
      accepted: ["student@example.com"],
      rejected: [],
    });
    mockedCreateTransport.mockReturnValue({ sendMail } as never);
    process.env.MAIL_PROVIDER = "gmail";
    process.env.GMAIL_USER = "homework@homeworksheets.co.nz";
    process.env.GMAIL_APP_PASSWORD = "gmail-password";

    const result = await sendHomeworkEmail({
      to: "student@example.com",
      subject: "Homework",
      html: "<p>Homework</p>",
    });

    expect(mockedCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com" }));
    expect(result).toMatchObject({ ok: true, provider: "gmail", status: 200 });
  });
});