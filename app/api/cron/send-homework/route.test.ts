import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import {
  getSupabaseHomeworkForDate,
  getSupabaseStudents,
  logSentEmail,
} from "../../../lib/supabaseHomeworkData";
import { sendHomeworkEmail } from "../../../lib/email";

vi.mock("../../../lib/supabaseHomeworkData", () => ({
  getSupabaseHomeworkForDate: vi.fn(),
  getSupabaseStudents: vi.fn(),
  logSentEmail: vi.fn(),
}));

vi.mock("../../../lib/email", () => ({
  sendHomeworkEmail: vi.fn(),
}));

vi.mock("../../../lib/cronSummaryEmail", () => ({
  sendCronSummaryEmail: vi.fn(),
}));

vi.mock("../../../lib/homeworkEmail", () => ({
  buildHomeworkEmailPayload: vi.fn(() => ({
    subject: "Homework for Monday",
    html: "<p>Homework</p>",
  })),
}));

const mockedGetHomework = vi.mocked(getSupabaseHomeworkForDate);
const mockedGetStudents = vi.mocked(getSupabaseStudents);
const mockedLogSentEmail = vi.mocked(logSentEmail);
const mockedSendEmail = vi.mocked(sendHomeworkEmail);

const homeworkRow = {
  date: "2026-08-24",
  day: "Monday",
  year_level: "5",
  maths_topic: "Fractions",
  maths_instructions: "Complete the questions",
  maths_questions: ["1/2 + 1/4"],
  maths_word_problem: "A fraction problem",
  reading_title: "Test reading",
  reading_text: "Test text",
  reading_questions: ["What happened?"],
  writing_type: "Creative",
  writing_prompt: "Write a story",
  writing_word_count: "50 words",
  grammar_topic: "Nouns",
  grammar_instruction: "Identify the nouns",
  grammar_exercise: "Find the nouns",
};

function mondayRequest() {
  return new Request(
    "http://localhost/api/cron/send-homework?date=2026-08-24",
    {
      method: "POST",
      headers: {
        "x-cron-secret": "test-secret",
        "content-type": "application/json",
      },
      body: "{}",
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mockedGetHomework.mockResolvedValue([homeworkRow]);
  mockedSendEmail.mockResolvedValue({
    ok: true,
    status: 200,
    body: { id: "test-email" },
    provider: "resend",
  });
});

describe("POST /api/cron/send-homework", () => {
  it.each([null, undefined, "", "   ", ",,"])(
    "does not send when student days are %s",
    async (days) => {
      mockedGetStudents.mockResolvedValue([
        {
          name: "Test Student",
          email: "student@example.com",
          level: "5",
          days,
        },
      ]);

      const response = await POST(mondayRequest());

      expect(response.status).toBe(200);
      expect(mockedSendEmail).not.toHaveBeenCalled();
      expect(mockedLogSentEmail).not.toHaveBeenCalled();
    },
  );

  it("sends when Monday is explicitly listed", async () => {
    mockedGetStudents.mockResolvedValue([
      {
        name: "Test Student",
        email: "student@example.com",
        level: "5",
        days: " Wednesday, Monday ",
      },
    ]);

    await POST(mondayRequest());

    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "student@example.com" }),
    );
    expect(mockedLogSentEmail).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent", date: "2026-08-24" }),
    );
  });

  it("does not send when Monday is not listed", async () => {
    mockedGetStudents.mockResolvedValue([
      {
        name: "Test Student",
        email: "student@example.com",
        level: "5",
        days: "Wednesday, Friday",
      },
    ]);

    await POST(mondayRequest());

    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("skips non-homework days without loading students or homework", async () => {
    const request = new Request(
      "http://localhost/api/cron/send-homework?date=2026-08-25",
      { headers: { "x-cron-secret": "test-secret" } },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockedGetStudents).not.toHaveBeenCalled();
    expect(mockedGetHomework).not.toHaveBeenCalled();
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("does not send when no homework exists for the date", async () => {
    mockedGetStudents.mockResolvedValue([]);
    mockedGetHomework.mockResolvedValue([]);

    const response = await POST(mondayRequest());

    expect(response.status).toBe(200);
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("records a provider failure without throwing", async () => {
    mockedGetStudents.mockResolvedValue([
      {
        name: "Test Student",
        email: "student@example.com",
        level: "5",
        days: "Monday",
      },
    ]);
    mockedSendEmail.mockResolvedValue({
      ok: false,
      status: 400,
      body: { error: "Rejected" },
      provider: "resend",
    });

    const response = await POST(mondayRequest());

    expect(response.status).toBe(200);
    expect(mockedLogSentEmail).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });
});
