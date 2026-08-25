import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateWeeklyHomeworkWithUsage } from "./homeworkGeneration";

const mockedFetch = vi.fn();

type SchoolDay = {
  date: string;
  dateStr: string;
};

const schoolDays: SchoolDay[] = [
  { date: "Monday 24 August 2026", dateStr: "2026-08-24" },
  { date: "Wednesday 26 August 2026", dateStr: "2026-08-26" },
];

function createHomeworkEntry(date: string) {
  return {
    date,
    maths: {
      topic: "Fractions",
      instructions: "Complete the questions",
      questions: ["1/2 + 1/4"],
      word_problem: "A fraction problem",
    },
    english: {
      reading_passage: {
        title: "A Test Passage",
        text: "Test reading text",
        questions: ["What happened?"],
      },
      writing_task: {
        type: "Creative writing",
        prompt: "Write a story",
        word_count: "50-70 words",
      },
      grammar_focus: {
        topic: "Nouns",
        instruction: "Identify the nouns",
        exercise: "Find the nouns",
      },
    },
  };
}

function claudeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successfulClaudeBody(text: string) {
  return {
    content: [{ text }],
    usage: {
      input_tokens: 100,
      output_tokens: 40,
      cache_read_input_tokens: 25,
      cache_creation_input_tokens: 10,
    },
    stop_reason: "end_turn",
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockedFetch);
  mockedFetch.mockReset();
  process.env.CLAUDE_API_KEY = "test-api-key";
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_MODEL;
  delete process.env.CLAUDE_MAX_TOKENS;
  delete process.env.MAX_TOKENS;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CLAUDE_API_KEY;
});

describe("generateWeeklyHomeworkWithUsage", () => {
  it("sends the year level and school days and returns parsed homework with usage", async () => {
    const entries = schoolDays.map((day) => createHomeworkEntry(day.date));
    mockedFetch.mockResolvedValueOnce(
      claudeResponse(successfulClaudeBody(JSON.stringify(entries))),
    );

    const result = await generateWeeklyHomeworkWithUsage({
      yearLevel: 5,
      schoolDays,
      curriculumContent: "Fractions: add fractions with related denominators",
      recentTopics: [{ mathsTopic: "Place value" }],
    });

    expect(result.entries).toEqual(entries);
    expect(result.usage).toMatchObject({
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      cacheReadInputTokens: 25,
      cacheCreationInputTokens: 10,
      billedInputEstimate: 75,
      model: "claude-3-5-sonnet-latest",
      maxTokens: 6500,
    });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const request = mockedFetch.mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse(String(request.body));
    const prompt = requestBody.messages[0].content
      .map((part: { text: string }) => part.text)
      .join("\n");

    expect(requestBody.model).toBe("claude-3-5-sonnet-latest");
    expect(prompt).toContain("Year level: 5");
    expect(prompt).toContain("Monday 24 August 2026");
    expect(prompt).toContain("Wednesday 26 August 2026");
    expect(prompt).toContain("Fractions: add fractions with related denominators");
    expect(prompt).toContain("Place value");
  });

  it("parses JSON wrapped in a Markdown code fence", async () => {
    const entry = createHomeworkEntry(schoolDays[0].date);
    mockedFetch.mockResolvedValueOnce(
      claudeResponse(successfulClaudeBody(`\n\`\`\`json\n${JSON.stringify([entry])}\n\`\`\``)),
    );

    const result = await generateWeeklyHomeworkWithUsage({
      yearLevel: "3",
      schoolDays: [schoolDays[0]],
    });

    expect(result.entries).toEqual([entry]);
  });

  it("uses configured model and token settings", async () => {
    process.env.CLAUDE_MODEL = "test-model";
    process.env.CLAUDE_MAX_TOKENS = "1200";
    mockedFetch.mockResolvedValueOnce(
      claudeResponse(successfulClaudeBody("[]")),
    );

    const result = await generateWeeklyHomeworkWithUsage({
      yearLevel: 6,
      schoolDays: [],
    });

    const requestBody = JSON.parse(String((mockedFetch.mock.calls[0][1] as RequestInit).body));
    expect(requestBody.model).toBe("test-model");
    expect(requestBody.max_tokens).toBe(1200);
    expect(result.usage).toMatchObject({ model: "test-model", maxTokens: 1200 });
  });

  it("rejects when no Claude API key is configured", async () => {
    delete process.env.CLAUDE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      generateWeeklyHomeworkWithUsage({ yearLevel: 5, schoolDays }),
    ).rejects.toThrow("Missing Claude API key.");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rejects a Claude HTTP error", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response("rate limited", { status: 429 }),
    );

    await expect(
      generateWeeklyHomeworkWithUsage({ yearLevel: 5, schoolDays }),
    ).rejects.toThrow("Claude API error: 429 rate limited");
  });

  it("rejects empty Claude content", async () => {
    mockedFetch.mockResolvedValueOnce(
      claudeResponse({ content: [{ text: "  " }] }),
    );

    await expect(
      generateWeeklyHomeworkWithUsage({ yearLevel: 5, schoolDays }),
    ).rejects.toThrow("Claude returned no content.");
  });

  it("rejects a response without a JSON array", async () => {
    mockedFetch.mockResolvedValueOnce(
      claudeResponse(successfulClaudeBody("This is not JSON homework")),
    );

    await expect(
      generateWeeklyHomeworkWithUsage({ yearLevel: 5, schoolDays }),
    ).rejects.toThrow("Could not find a JSON array in the Claude response.");
  });

  it("rejects malformed JSON", async () => {
    mockedFetch.mockResolvedValueOnce(
      claudeResponse(successfulClaudeBody('[{"date":"Monday",}]')),
    );

    await expect(
      generateWeeklyHomeworkWithUsage({ yearLevel: 5, schoolDays }),
    ).rejects.toThrow(/Claude returned malformed JSON for Year 5/);
  });
});
