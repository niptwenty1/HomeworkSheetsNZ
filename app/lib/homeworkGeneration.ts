type SchoolDay = {
  date: string;
  dateStr: string;
};

type ClaudeHomeworkEntry = {
  date: string;
  maths: {
    topic: string;
    instructions: string;
    questions: string[];
    word_problem: string;
  };
  english: {
    reading_passage: {
      title: string;
      text: string;
      questions: string[];
    };
    writing_task: {
      type: string;
      prompt: string;
      word_count: string;
    };
    grammar_focus: {
      topic: string;
      instruction: string;
      exercise: string;
    };
  };
};

export type ClaudeGenerationUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  maxTokens: number;
};

export type WeeklyHomeworkGenerationResult = {
  entries: ClaudeHomeworkEntry[];
  usage: ClaudeGenerationUsage;
};

function clip(value: string, max = 400) {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...<truncated ${value.length - max} chars>`;
}

function countChar(value: string, char: string) {
  let count = 0;
  for (const c of value) {
    if (c === char) count += 1;
  }
  return count;
}

function buildJsonShapeStats(payload: string) {
  const openCurly = countChar(payload, "{");
  const closeCurly = countChar(payload, "}");
  const openSquare = countChar(payload, "[");
  const closeSquare = countChar(payload, "]");

  return {
    openCurly,
    closeCurly,
    openSquare,
    closeSquare,
    curlyBalance: openCurly - closeCurly,
    squareBalance: openSquare - closeSquare,
    startsWithArray: payload.trimStart().startsWith("["),
    endsWithArray: payload.trimEnd().endsWith("]"),
  };
}

function createParseErrorContext(payload: string, parseError: Error) {
  const message = String(parseError.message || "Unknown JSON parse error");
  const match = message.match(/position\s+(\d+)/i);
  const position = match ? Number.parseInt(match[1], 10) : -1;

  if (Number.isNaN(position) || position < 0 || position > payload.length) {
    return {
      position: null,
      snippet: clip(payload, 500),
    };
  }

  const safePosition = Math.min(position, payload.length - 1);
  const start = Math.max(0, safePosition - 120);
  const end = Math.min(payload.length, position + 120);
  return {
    position,
    snippet: clip(payload.slice(start, end), 500),
  };
}

function getMaxTokens() {
  const raw = process.env.CLAUDE_MAX_TOKENS || process.env.MAX_TOKENS || "6500";
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 6500;
  }
  return parsed;
}

function dedupeAndLimit(values: string[], limit = 8) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }

  return result;
}

function buildRecentTopicsSummary(
  topics: Array<{ date?: string; mathsTopic?: string; readingTopic?: string; writingTopic?: string; grammarTopic?: string }>,
) {
  if (!topics.length) {
    return "No recent topics provided.";
  }

  const maths = dedupeAndLimit(topics.map((item) => String(item.mathsTopic || "")));
  const reading = dedupeAndLimit(topics.map((item) => String(item.readingTopic || "")));
  const writing = dedupeAndLimit(topics.map((item) => String(item.writingTopic || "")));
  const grammar = dedupeAndLimit(topics.map((item) => String(item.grammarTopic || "")));

  const lines = [
    maths.length ? `- Maths: ${maths.join("; ")}` : "",
    reading.length ? `- Reading: ${reading.join("; ")}` : "",
    writing.length ? `- Writing: ${writing.join("; ")}` : "",
    grammar.length ? `- Grammar: ${grammar.join("; ")}` : "",
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "No recent topics provided.";
}

function buildBaseInstructionBlock() {
  return `BASE RULES
You generate weekly homework for New Zealand primary/intermediate students.
Output must be valid JSON only (no markdown, no code fences, no extra text).

CHILD SAFETY (STRICT)
All content must be safe and age-appropriate.
Do not include sexual content, romantic/relationship advice, suggestive material, violence, weapons use, assault, abuse, self-harm, suicide, dangerous trends, drugs, alcohol, vaping, smoking, gambling, hate speech, extremist content, demeaning stereotypes, frightening/disturbing scenarios, or adult-only themes.
Use neutral, child-friendly language. If a topic becomes mature, replace it with a safe school-appropriate alternative.

VARIETY ACROSS THE WEEK
Vary maths topics, reading topics, reading genres, writing tasks, and grammar focus areas.

READING DIVERSITY
Use a wide mix of topics such as science, history, geography, technology, inventions, environment, arts, sports, health, culture, engineering, oceans, climate, and global everyday life.
Do not make most passages about New Zealand/kiwi/local topics; use New Zealand topics occasionally only.

REPETITION CONTROL
Avoid repeating recent reading topics/passages, writing prompts, grammar exercises, and maths contexts.
If revisiting a skill, use a clearly different scenario/context.

OUTPUT SCHEMA (EXACT)
Return a JSON array with one object per listed school day, in the same order.
Each object must match this structure exactly:
{
  "date": "Monday 1 April 2026",
  "maths": {
    "topic": "Topic name",
    "instructions": "Brief instructions for students",
    "questions": ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8"],
    "word_problem": "A multi-step word problem"
  },
  "english": {
    "reading_passage": {
      "title": "Passage title",
      "text": "passage suitable for the selected year level, maximum 200 words",
      "questions": ["Question 1","Question 2","Question 3","Question 4"]
    },
    "writing_task": {
      "type": "Creative writing or Formal writing (alternate across the week)",
      "prompt": "The writing prompt",
      "word_count": "Year-appropriate number of words .. maximum 100-150 words"
    },
    "grammar_focus": {
      "topic": "Grammar topic",
      "instruction": "What students need to do",
      "exercise": "The grammar exercise (3-5 sentences or tasks)"
    }
  }
}`;
}

function buildYearContextBlock(yearLevel: string, curriculumSection: string) {
  return `YEAR CONTEXT
Year level: ${yearLevel}
You are an experienced Year ${yearLevel} teacher in New Zealand.
Each homework set should take approximately 20-30 minutes and align with the New Zealand Curriculum for Year ${yearLevel}.
The curriculum represents end-of-year expectations. Sequence work from foundational to more advanced learning as the school year progresses. Do not assume students have mastered later-year content too early.

${curriculumSection || "No additional curriculum content provided."}`;
}

function buildDynamicRequestBlock(params: {
  schoolDays: SchoolDay[];
  datelistStr: string;
  recentTopicsSummary: string;
}) {
  return `REQUEST
Generate a complete homework set for every listed school day.

School days:
${params.datelistStr}

Recent topics to avoid repeating:
${params.recentTopicsSummary}

Return ONLY a valid JSON array with exactly ${params.schoolDays.length} objects in the same order as the listed school days.`;
}

export async function generateWeeklyHomeworkWithUsage({
  yearLevel,
  schoolDays,
  curriculumContent = "",
  recentTopics = [],
  students = [],
}: {
  yearLevel: string | number;
  schoolDays: SchoolDay[];
  curriculumContent?: string;
  recentTopics?: Array<{ date?: string; mathsTopic?: string; readingTopic?: string; writingTopic?: string; grammarTopic?: string }>;
  students?: Array<{ name?: string; email?: string; level?: string; difficultyLevel?: string; days?: string }>;
}): Promise<WeeklyHomeworkGenerationResult> {
  const normalizedYearLevel = String(yearLevel || 6);
  const requestStartedAt = Date.now();
  const datelistStr = schoolDays
    .map((day, index) => `${index + 1}. ${day.date}`)
    .join("\n");

  const curriculumSection = curriculumContent
    ? `Use the following NZ Curriculum content:\n${curriculumContent}`
    : "";

  const topics = recentTopics || [];
  const recentTopicsSummary = buildRecentTopicsSummary(topics);
  void students;

  const baseInstructionBlock = buildBaseInstructionBlock();
  const yearContextBlock = buildYearContextBlock(normalizedYearLevel, curriculumSection);
  const dynamicRequestBlock = buildDynamicRequestBlock({
    schoolDays,
    datelistStr,
    recentTopicsSummary,
  });

  const prompt = `${baseInstructionBlock}\n\n${yearContextBlock}\n\n${dynamicRequestBlock}`;

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Claude API key.");
  }

  const maxTokens = getMaxTokens();
  const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest";

  console.info("[homeworkGeneration] Claude request start", {
    yearLevel: normalizedYearLevel,
    schoolDaysCount: schoolDays.length,
    curriculumChars: curriculumContent.length,
    recentTopicsCount: topics.length,
    model,
    maxTokens,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  console.info("[homeworkGeneration] Claude request finished", {
    yearLevel: normalizedYearLevel,
    durationMs: Date.now() - requestStartedAt,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[homeworkGeneration] Claude API returned error response", {
      yearLevel: normalizedYearLevel,
      status: response.status,
      errorPreview: clip(errorText, 800),
    });
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    content?: Array<{ text?: string }>;
    error?: unknown;
    stop_reason?: string;
    stop_sequence?: string | null;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  if (data.error) {
    console.error("[homeworkGeneration] Claude API error object", {
      yearLevel: normalizedYearLevel,
      error: data.error,
    });
    throw new Error(`Claude API error: ${JSON.stringify(data.error)}`);
  }

  const text = data.content?.[0]?.text?.trim() || "";
  const inputTokens = Number(data.usage?.input_tokens || 0);
  const outputTokens = Number(data.usage?.output_tokens || 0);

  console.info("[homeworkGeneration] Claude response metadata", {
    yearLevel: normalizedYearLevel,
    stopReason: data.stop_reason || null,
    stopSequence: data.stop_sequence || null,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    textLength: text.length,
  });

  if (!text) {
    console.error("[homeworkGeneration] Claude returned empty content", {
      yearLevel: normalizedYearLevel,
      usage: data.usage || null,
    });
    throw new Error("Claude returned no content.");
  }

  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1) {
    console.error("[homeworkGeneration] JSON array delimiters missing", {
      yearLevel: normalizedYearLevel,
      cleanedLength: cleaned.length,
      responsePreview: clip(cleaned, 800),
    });
    throw new Error("Could not find a JSON array in the Claude response.");
  }

  const payload = cleaned.slice(arrayStart, arrayEnd + 1);
  const payloadShape = buildJsonShapeStats(payload);
  let parsed: ClaudeHomeworkEntry[];
  try {
    parsed = JSON.parse(payload) as ClaudeHomeworkEntry[];
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error(String(error));
    const context = createParseErrorContext(payload, parseError);
    console.error("[homeworkGeneration] Failed to parse Claude JSON", {
      yearLevel: normalizedYearLevel,
      cleanedLength: cleaned.length,
      payloadLength: payload.length,
      parseError: parseError.message,
      parsePosition: context.position,
      payloadShape,
      likelyTruncated:
        (context.position === payload.length || parseError.message.includes(`position ${payload.length}`)) &&
        (payloadShape.curlyBalance !== 0 || payloadShape.squareBalance !== 0),
      stopReason: data.stop_reason || null,
      stopSequence: data.stop_sequence || null,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      payloadSnippet: context.snippet,
      payloadTailPreview: clip(payload.slice(Math.max(0, payload.length - 600)), 900),
      fullResponsePreview: clip(cleaned, 800),
    });
    throw new Error(`Claude returned malformed JSON for Year ${normalizedYearLevel}: ${parseError.message}`);
  }

  if (parsed.length !== schoolDays.length) {
    console.warn("[homeworkGeneration] Parsed array length does not match school days", {
      yearLevel: normalizedYearLevel,
      expected: schoolDays.length,
      actual: parsed.length,
    });
  }

  console.info("[homeworkGeneration] Claude response parsed", {
    yearLevel: normalizedYearLevel,
    entries: parsed.length,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  });

  return {
    entries: parsed,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model,
      maxTokens,
    },
  };
}

export async function generateWeeklyHomework(args: {
  yearLevel: string | number;
  schoolDays: SchoolDay[];
  curriculumContent?: string;
  recentTopics?: Array<{ date?: string; mathsTopic?: string; readingTopic?: string; writingTopic?: string; grammarTopic?: string }>;
  students?: Array<{ name?: string; email?: string; level?: string; difficultyLevel?: string; days?: string }>;
}) {
  const result = await generateWeeklyHomeworkWithUsage(args);
  return result.entries;
}
