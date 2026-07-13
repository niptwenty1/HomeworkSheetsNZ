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

function createParseErrorContext(payload: string, parseError: Error) {
  const message = String(parseError.message || "Unknown JSON parse error");
  const match = message.match(/position\s+(\d+)/i);
  const position = match ? Number.parseInt(match[1], 10) : -1;

  if (Number.isNaN(position) || position < 0 || position >= payload.length) {
    return {
      position: null,
      snippet: clip(payload, 500),
    };
  }

  const start = Math.max(0, position - 120);
  const end = Math.min(payload.length, position + 120);
  return {
    position,
    snippet: clip(payload.slice(start, end), 500),
  };
}

function getMaxTokens() {
  const raw = process.env.CLAUDE_MAX_TOKENS || process.env.MAX_TOKENS || "4000";
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 4000;
  }
  return parsed;
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
  void students;

  const prompt = `
You are an experienced Year ${normalizedYearLevel} teacher in New Zealand.

Generate a complete homework set for every school day listed below.

Each homework set should take approximately 20–30 minutes to complete and align with the New Zealand Curriculum for Year ${normalizedYearLevel}.

The curriculum provided represents the learning outcomes expected by the end of the academic year. The New Zealand school year consists of four terms of approximately 10 weeks each, separated by school holidays.

Students should progressively build towards the end-of-year curriculum expectations. Do not assume students have already mastered content that is intended to be learned later in the year.

Start with foundational concepts and gradually increase complexity as the school year progresses.

The homework should feel like a structured learning journey rather than random disconnected activities.

## Child Safety Rules (Strict)

All generated content must be safe and age-appropriate for primary/intermediate school students.

You must NOT include or reference:

* Sexual content, romantic/relationship advice, or suggestive material
* Violence, gore, weapons use, assault, abuse, or criminal instructions
* Self-harm, suicide, or dangerous challenge/trend content
* Drugs, alcohol, vaping, smoking, or gambling
* Hate speech, discrimination, extremist content, or demeaning stereotypes
* Frightening, disturbing, or traumatic scenarios not suitable for children
* Any adult-only themes or mature life situations

Use neutral, child-friendly language throughout.

If a topic could become mature, replace it with a safe alternative suitable for school children.

## Variety Requirements

Vary the following across the week:

* Maths topics
* Reading topics
* Reading genres
* Writing tasks
* Grammar focus areas

Students should encounter a broad range of content and skills over time.

## Reading Content Diversity

Reading passages should expose students to a wide variety of knowledge and ideas.

Rotate topics across areas such as:

* Science
* Space
* Animals
* Inventions
* Technology
* Ancient Civilisations
* World History
* Geography
* Famous People
* Environmental Issues
* Sports
* Health and Wellbeing
* Cultural Traditions from Around the World
* Exploration and Discovery
* Engineering
* Oceans
* Weather and Climate
* Art and Music
* Everyday Life in Different Countries

Do not make most reading passages about New Zealand, Kiwi culture, or local topics.

New Zealand-based content should be used occasionally but should not dominate the reading programme.

The goal is to improve reading comprehension while expanding students' general knowledge, vocabulary, and curiosity about the world.

## Repetition Rules

Avoid repeating:

* Reading topics recently used
* Similar reading passages
* Writing prompts recently used
* Grammar exercises recently used
* Maths question contexts recently used

recently used topics listed below
${JSON.stringify(topics)}

If a similar curriculum skill needs to be practised again, create a completely new scenario, story, context, or application.

The homework should feel fresh and interesting each time a student receives it.

## Student Engagement

Use interesting, age-appropriate topics that encourage curiosity and learning.

Balance educational value with engagement.

The reading, writing, grammar, and maths activities should work together to create a varied and enjoyable learning experience while remaining aligned to the curriculum.


${curriculumSection}

School days to generate homework for:
${datelistStr}

Return ONLY a valid JSON array — no markdown, no code fences, no extra text. The array must have exactly ${schoolDays.length} objects, one per school day, in the same order listed above.

Each object must follow this exact structure:
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
      "text": "passage suitable for Year ${normalizedYearLevel} NZ students, maximum 200 words",
      "questions": ["Question 1","Question 2","Question 3","Question 4"]
    },
    "writing_task": {
      "type": "Creative writing or Formal writing (alternate across the week)",
      "prompt": "The writing prompt",
      "word_count": "Year ${normalizedYearLevel} appropriate number of words .. maximum 100-150 words"
    },
    "grammar_focus": {
      "topic": "Grammar topic",
      "instruction": "What students need to do",
      "exercise": "The grammar exercise (3-5 sentences or tasks)"
    }
  }
}`;

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
      payloadSnippet: context.snippet,
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

  const inputTokens = Number(data.usage?.input_tokens || 0);
  const outputTokens = Number(data.usage?.output_tokens || 0);

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
