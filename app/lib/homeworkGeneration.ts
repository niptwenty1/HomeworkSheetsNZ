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

export async function generateWeeklyHomework({
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
}) {
  const normalizedYearLevel = String(yearLevel || 6);
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
      "text": "150-200 word passage suitable for Year ${normalizedYearLevel} NZ students",
      "questions": ["Question 1","Question 2","Question 3","Question 4"]
    },
    "writing_task": {
      "type": "Creative writing or Formal writing (alternate across the week)",
      "prompt": "The writing prompt",
      "word_count": "100-150 words"
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest",
      max_tokens: Number(process.env.CLAUDE_MAX_TOKENS || 4000),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    content?: Array<{ text?: string }>;
    error?: unknown;
  };

  if (data.error) {
    throw new Error(`Claude API error: ${JSON.stringify(data.error)}`);
  }

  const text = data.content?.[0]?.text?.trim() || "";
  if (!text) {
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
    throw new Error("Could not find a JSON array in the Claude response.");
  }

  const parsed = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as ClaudeHomeworkEntry[];
  return parsed;
}
