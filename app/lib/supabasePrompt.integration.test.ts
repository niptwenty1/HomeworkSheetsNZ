import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateWeeklyHomeworkWithUsage } from "./homeworkGeneration";
import { getSupabaseRecentHomeworkTopics } from "./supabaseHomeworkData";

const runIntegrationTests = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "true";

type SchoolDay = {
  date: string;
  dateStr: string;
};

function createClaudeEntry(date: string) {
  return {
    date,
    maths: {
      topic: "Integration test topic",
      instructions: "Complete the questions",
      questions: ["1 + 1"],
      word_problem: "An integration test problem",
    },
    english: {
      reading_passage: {
        title: "Integration Test Reading",
        text: "Integration test text",
        questions: ["What happened?"],
      },
      writing_task: {
        type: "Creative writing",
        prompt: "Write a story",
        word_count: "50 words",
      },
      grammar_focus: {
        topic: "Nouns",
        instruction: "Identify the nouns",
        exercise: "Find the nouns",
      },
    },
  };
}

describe.skipIf(!runIntegrationTests)("Supabase topic and prompt integration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running Supabase integration tests.",
      );
    }

    process.env.CLAUDE_API_KEY = "integration-test-placeholder";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.CLAUDE_API_KEY;
  });

  it("pulls recent topics from Supabase and captures the prompt without calling Claude", async () => {
    const yearLevel = process.env.TEST_YEAR_LEVEL || "5";
    const referenceDateString = process.env.TEST_REFERENCE_DATE || "2026-08-24";
    const referenceDate = new Date(`${referenceDateString}T12:00:00Z`);
    const recentTopics = await getSupabaseRecentHomeworkTopics(yearLevel, referenceDate);

    const schoolDays: SchoolDay[] = [
      {
        date: "Monday 24 August 2026",
        dateStr: "2026-08-24",
      },
    ];
    let capturedRequest: RequestInit | undefined;
    const capturedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(input);
      expect(requestUrl).toBe("https://api.anthropic.com/v1/messages");
      capturedRequest = init;

      const entry = createClaudeEntry(schoolDays[0].date);
      return new Response(
        JSON.stringify({
          content: [{ text: JSON.stringify([entry]) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    globalThis.fetch = capturedFetch as typeof fetch;

    await generateWeeklyHomeworkWithUsage({
      yearLevel,
      schoolDays,
      recentTopics,
    });

    expect(capturedRequest).toBeDefined();
    const requestBody = JSON.parse(String(capturedRequest?.body));
    const prompt = requestBody.messages[0].content
      .map((part: { text: string }) => part.text)
      .join("\n");

    expect(capturedFetch).toHaveBeenCalledTimes(1);
    expect(prompt).toContain("Recent topics to avoid repeating:");
    const topicValues = recentTopics.flatMap((topic) => [
      topic.mathsTopic,
      topic.readingTopic,
      topic.writingPrompt,
      topic.grammarTopic,
    ]).filter((topic): topic is string => Boolean(topic));
    const includedTopics = Array.from(new Set(topicValues.filter((topic) => prompt.includes(topic))));
    const omittedTopics = Array.from(new Set(topicValues.filter((topic) => !prompt.includes(topic))));

    const reportDirectory = join(process.cwd(), "test-reports");
    const reportPath = join(reportDirectory, "supabase-prompt-report.json");
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          yearLevel,
          referenceDate: referenceDateString,
          recentTopics,
          includedTopics,
          omittedTopics,
          prompt,
          claudeRequestMocked: true,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`Supabase prompt report written to ${reportPath}`);

    if (topicValues.length > 0) {
      expect(includedTopics.length).toBeGreaterThan(0);
    }
  });
});
