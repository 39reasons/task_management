import type { TaskDraftSuggestion, Task } from "@shared/types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions";
const TASK_DRAFT_MODEL =
  process.env.OPENAI_TASK_DRAFT_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface TaskDraftInput {
  prompt: string;
  project_id?: string | null;
  stage_id?: string | null;
}

interface DraftOptions {
  userId?: string | null;
}

const SYSTEM_PROMPT = `You are an expert project manager who turns short task briefs into actionable task drafts.
Respond only with minified JSON that matches this TypeScript type exactly:
{
  "title": string;
  "description": string;
  "priority": "low" | "medium" | "high" | null;
  "due_date": string | null;
  "tags": string[];
  "subtasks": string[];
}
Prefer concise titles, a markdown-friendly description, and at most five tags. If you are unsure of a field, return null or an empty array.`;

export async function generateTaskDraft(
  input: TaskDraftInput,
  _options?: DraftOptions
): Promise<TaskDraftSuggestion> {
  const prompt = input.prompt?.trim();
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  if (!OPENAI_API_KEY) {
    return heuristicDraft(prompt);
  }

  try {
    const response = await fetch(OPENAI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: TASK_DRAFT_MODEL,
        temperature: 0.7,
        messages: buildMessages(prompt, input),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to generate draft (status ${response.status} ${response.statusText})`
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string | Array<{ type: string; text?: string }> };
      }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content;
    const jsonText = extractTextContent(rawContent);
    if (!jsonText) {
      throw new Error("Model response did not include content");
    }

    const parsed = parseSuggestion(jsonText);
    return normalizeSuggestion(parsed, prompt);
  } catch (error) {
    console.warn("AI draft generation failed, falling back to heuristic draft", error);
    return heuristicDraft(prompt);
  }
}

function buildMessages(prompt: string, input: TaskDraftInput) {
  const contextChunks = [
    `Task prompt: ${prompt}`,
    input.project_id ? `Project ID: ${input.project_id}` : null,
    input.stage_id ? `Stage ID: ${input.stage_id}` : null,
  ].filter(Boolean);

  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: contextChunks.join("\n"),
    },
  ];
}

function extractTextContent(
  content: string | Array<{ type: string; text?: string }> | undefined
): string | null {
  if (!content) {
    return null;
  }

  if (typeof content === "string") {
    return content;
  }

  const textParts = content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string);

  return textParts.length > 0 ? textParts.join("\n") : null;
}

function parseSuggestion(input: string): TaskDraftSuggestion {
  const jsonCandidate = extractJsonBlock(input);
  if (!jsonCandidate) {
    throw new Error("Unable to find JSON block in model response");
  }

  const parsed = JSON.parse(jsonCandidate) as TaskDraftSuggestion;
  return parsed;
}

function extractJsonBlock(text: string): string | null {
  const codeFenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeFenceMatch) {
    return codeFenceMatch[1].trim();
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  return braceMatch ? braceMatch[0] : null;
}

function normalizeSuggestion(
  suggestion: TaskDraftSuggestion,
  originalPrompt: string
): TaskDraftSuggestion {
  const safePriority = normalizePriority(suggestion.priority);
  const dueDate = normalizeDateString(suggestion.due_date);
  const tags = Array.isArray(suggestion.tags)
    ? uniqueStrings(suggestion.tags)
    : [];
  const subtasks = Array.isArray(suggestion.subtasks)
    ? suggestion.subtasks.map((task) => task.trim()).filter(Boolean)
    : [];

  return {
    title: suggestion.title?.trim() || deriveTitleFromPrompt(originalPrompt),
    description:
      suggestion.description?.trim() || buildFallbackDescription(originalPrompt),
    priority: safePriority,
    due_date: dueDate,
    tags,
    subtasks,
  };
}

function heuristicDraft(prompt: string): TaskDraftSuggestion {
  const title = deriveTitleFromPrompt(prompt);
  const description = buildFallbackDescription(prompt);
  const subtasks = deriveSubtasks(prompt);

  return {
    title,
    description,
    priority: inferPriority(prompt),
    due_date: null,
    tags: inferTags(prompt),
    subtasks,
  };
}

function deriveTitleFromPrompt(prompt: string): string {
  const firstSentence = prompt
    .split(/[\n\.!?]/)
    .map((sentence) => sentence.trim())
    .find(Boolean);

  const titleCandidate = firstSentence || "AI Drafted Task";
  const normalized = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

function buildFallbackDescription(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  const subtasks = deriveSubtasks(prompt);
  const steps = subtasks.length
    ? `\n\n### Suggested steps\n${subtasks.map((step) => `- ${step}`).join("\n")}`
    : "";

  return `### Objective\n${cleaned}${steps}`;
}

function deriveSubtasks(prompt: string): string[] {
  const fragments = prompt
    .split(/[\n\.!?]/)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0 && fragment.length < 160)
    .slice(0, 5);

  return fragments.map(capitalizeFirstLetter);
}

function normalizePriority(priority: TaskDraftSuggestion["priority"]): Task["priority"] | null {
  if (!priority) return null;
  const lowered = priority.toLowerCase() as Task["priority"];
  if (lowered === "low" || lowered === "medium" || lowered === "high") {
    return lowered;
  }
  return null;
}

function normalizeDateString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    seen.add(capitalizeWords(normalized));
  }
  return Array.from(seen);
}

function inferPriority(prompt: string): Task["priority"] {
  const lowered = prompt.toLowerCase();
  if (/(urgent|asap|critical|blocker|deadline)/.test(lowered)) {
    return "high";
  }
  if (/(nice to have|someday|optional)/.test(lowered)) {
    return "low";
  }
  return "medium";
}

function inferTags(prompt: string): string[] {
  const lowered = prompt.toLowerCase();
  const tags: string[] = [];

  if (/(bug|fix|issue)/.test(lowered)) tags.push("Bugfix");
  if (/(design|ui|ux|layout)/.test(lowered)) tags.push("Design");
  if (/(deploy|release|infra|ops)/.test(lowered)) tags.push("Operations");
  if (/(research|investigate|spike)/.test(lowered)) tags.push("Research");
  if (/(test|qa|validate)/.test(lowered)) tags.push("QA");

  return tags.slice(0, 5);
}

function capitalizeFirstLetter(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => capitalizeFirstLetter(word.toLowerCase()))
    .join(" ");
}
