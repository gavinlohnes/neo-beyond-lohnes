import Anthropic from "@anthropic-ai/sdk";
import { ALFRED_TOOLS, toProposal, type AlfredProposal } from "./alfredActions";

/**
 * ALFRED-001 (owner ruling RULES-2026-10-31): one conversation with Alfred. Claude reads BEYOND's
 * context (alfredContext.ts), answers, and proposes records through tools; the operator confirms each
 * one in the sheet. The key is the operator's own, kept on his phone and sent only to Anthropic.
 */
/**
 * ALFRED-003 (owner go "go cheap"): everyday Alfred runs on Claude Haiku 5.5 (about a fortieth of the
 * price); THINK HARDER sends one question to Claude Opus 5.5. Both read the same conversation; the
 * API drops any thinking block the receiving model can't read, so switching mid-conversation is safe.
 */
export const ALFRED_MODELS = { everyday: "claude-haiku-5-5", deep: "claude-opus-5-5" } as const;
export type AlfredDepth = keyof typeof ALFRED_MODELS;

const PERSONA = `You are Alfred, the man in the chair inside BEYOND, a personal operating system for one person: Gavin, who works 12-hour night shifts (18:00–06:00) on a 2-2-3 rotation, sleeps by day, and uses BEYOND for food, sleep, training, reminders and his life.

How you work:
- Answer from the BEYOND RECORDS below. Name the records you used ("your last 14 days show…"). If the records don't say, say you don't know. Never invent numbers, dates or events.
- When he tells you something to record or do (food, water, sleep, weight, a reminder, a note, a check-in, work started or ended, a task done or moved, a clean day, opening today's workout), call the matching tool. Each call becomes a card he confirms; nothing is saved until he does. Say briefly what you proposed.
- Use his saved meals when they match (saved_meal_id). Otherwise estimate macros and say they are estimates.
- Reminders: due_date is a calendar date; a night shift's "tonight" is the date the shift starts. "After I wake" on a work day means his afternoon wake-up, not the morning.
- BEYOND's own Engine makes recommendations. You explain, plan and remember; you don't override it.
- Be calm, short and concrete, like a trusted aide. No cheerleading, guilt, streaks or urgency. Plain sentences; short lists only when they help. Use his local times (24-hour).`;

export interface AlfredTurn { role: "user" | "alfred"; text: string; deep?: boolean; proposals?: { id: string; proposal: AlfredProposal; state: "pending" | "saved" | "skipped" }[] }
export interface AlfredReply { text: string; proposals: { id: string; proposal: AlfredProposal }[]; costUsd: number }

/** List price per token (input, output, cache read, 5-minute cache write); Haiku's is for prompts up to 100K tokens. */
const PRICE: Record<AlfredDepth, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  everyday: { input: 0.1 / 1e6, output: 0.5 / 1e6, cacheRead: 0.01 / 1e6, cacheWrite: 0.125 / 1e6 },
  deep: { input: 4 / 1e6, output: 20 / 1e6, cacheRead: 0.2 / 1e6, cacheWrite: 5 / 1e6 },
};

/** The request settings for a depth. Opus opts into the server-side refusal fallback; Haiku has none. */
function modelParams(depth: AlfredDepth) {
  return depth === "deep"
    ? { model: ALFRED_MODELS.deep, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const, output_config: { effort: "high" as const } }
    : { model: ALFRED_MODELS.everyday, output_config: { effort: "medium" as const } };
}

export class AlfredSession {
  private messages: Anthropic.Beta.BetaMessageParam[] = [];
  /** tool_use ids from the last reply, answered at the start of the next user turn. */
  private openToolUses: string[] = [];
  private readonly client: Anthropic;

  constructor(apiKey: string, private readonly context: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  /** `decisions` says what the operator did with each card from the last reply. */
  async send(text: string, decisions: Record<string, "saved" | "skipped" | "pending"> = {}, depth: AlfredDepth = "everyday"): Promise<AlfredReply> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = this.openToolUses.map((id) => ({
      type: "tool_result" as const, tool_use_id: id,
      content: decisions[id] === "saved" ? "The operator confirmed it; it is saved in BEYOND." : decisions[id] === "skipped" ? "The operator skipped it; nothing was saved." : "Shown to the operator as a card; not confirmed yet.",
    }));
    content.push({ type: "text", text });
    this.messages.push({ role: "user", content });
    this.openToolUses = [];

    const response = await this.client.beta.messages.create({
      ...modelParams(depth),
      max_tokens: depth === "deep" ? 8000 : 4000,
      system: [
        { type: "text", text: PERSONA },
        { type: "text", text: `BEYOND RECORDS (read just now):\n${this.context}`, cache_control: { type: "ephemeral" } },
      ],
      tools: ALFRED_TOOLS,
      tool_choice: { type: "auto" },
      messages: this.messages,
    });
    // Append the whole reply (thinking and tool blocks included) so the conversation stays append-only.
    this.messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });

    if (response.stop_reason === "refusal") return { text: "I can't help with that one.", proposals: [], costUsd: cost(response.usage, depth) };
    const proposals: { id: string; proposal: AlfredProposal }[] = [];
    const words: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") words.push(block.text);
      if (block.type === "tool_use") {
        this.openToolUses.push(block.id);
        const proposal = toProposal(block.name, block.input);
        if (proposal) proposals.push({ id: block.id, proposal });
      }
    }
    return { text: words.join("\n\n").trim(), proposals, costUsd: cost(response.usage, depth) };
  }
}

const BRIEF_ASK = `Write Alfred's brief for the top of TODAY: what matters right now and next, from the records. Two to four short sentences, plain text, no list, no heading, no greeting. Lead with the one thing most worth his attention (sleep before a shift, food and water against target, a task due, the shift ahead). Name times and numbers from the records. If the records are thin, say what's missing in one sentence.`;

/** ALFRED-003 #1: one short, cheap read of the records for TODAY. No tools; nothing is proposed or saved. */
export async function writeAlfredBrief(apiKey: string, context: string): Promise<{ text: string; costUsd: number }> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.beta.messages.create({
    model: ALFRED_MODELS.everyday,
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: [
      { type: "text", text: PERSONA },
      { type: "text", text: `BEYOND RECORDS (read just now):\n${context}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: BRIEF_ASK }],
  });
  const text = response.stop_reason === "refusal" ? "" : response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ").trim();
  return { text, costUsd: cost(response.usage, "everyday") };
}

function cost(u: Anthropic.Beta.BetaUsage, depth: AlfredDepth): number {
  const p = PRICE[depth];
  return (u.input_tokens ?? 0) * p.input + (u.output_tokens ?? 0) * p.output
    + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite;
}

/** A plain-words reason for a failed call, for the sheet. */
export function describeAlfredError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Your Claude key wasn't accepted. Check it in Alfred settings.";
  if (e instanceof Anthropic.RateLimitError) return "Claude is busy or your spend limit was reached. Try again shortly.";
  if (e instanceof Anthropic.APIConnectionError) return "No connection to Claude. BEYOND still works; Alfred needs a signal.";
  if (e instanceof Anthropic.APIError) return `Claude returned an error (${e.status}). Try again.`;
  return "Alfred couldn't answer. Try again.";
}
