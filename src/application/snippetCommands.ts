import { db } from "../persistence/db";
import type { LogTemplate, LogTemplateCard, TextSnippet } from "../domain/snippets/types";

const triggerPattern = /^;[a-z0-9][a-z0-9_-]{0,29}$/;
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

export async function saveSnippet(input: { id?: string; trigger: string; text: string }): Promise<TextSnippet> {
  const trigger = input.trigger.trim().toLowerCase(), text = input.text.trim();
  if (!triggerPattern.test(trigger)) throw new Error("Trigger must start with ; and use 1–30 lowercase letters, numbers, _ or -.");
  if (!text || text.length > 2000) throw new Error("Snippet text must be 1–2000 characters.");
  const duplicate = await db.textSnippets.where("trigger").equals(trigger).first();
  if (duplicate && duplicate.id !== input.id) throw new Error("That trigger already exists.");
  const previous = input.id ? await db.textSnippets.get(input.id) : undefined;
  const stamp = now(), row: TextSnippet = { id: input.id ?? id("snippet"), trigger, text, createdAt: previous?.createdAt ?? stamp, updatedAt: stamp };
  await db.textSnippets.put(row); return row;
}

export async function deleteSnippet(snippetId: string): Promise<void> { await db.textSnippets.delete(snippetId); }

export async function saveLogTemplate(input: { id?: string; name: string; cards: LogTemplateCard[] }): Promise<LogTemplate> {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new Error("Template name must be 1–80 characters.");
  if (!input.cards.length || input.cards.length > 12) throw new Error("A template needs 1–12 understood cards.");
  const all = await db.logTemplates.toArray(), duplicate = all.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.id !== input.id);
  if (duplicate) throw new Error("That template name already exists.");
  const previous = input.id ? await db.logTemplates.get(input.id) : undefined;
  const stamp = now(), row: LogTemplate = { id: input.id ?? id("template"), name, cards: structuredClone(input.cards), createdAt: previous?.createdAt ?? stamp, updatedAt: stamp };
  await db.logTemplates.put(row); return row;
}
export async function deleteLogTemplate(templateId: string): Promise<void> { await db.logTemplates.delete(templateId); }
