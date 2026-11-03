import { db } from "../persistence/db";
export async function getSnippets() { return db.textSnippets.orderBy("trigger").toArray(); }
export async function getLogTemplates() { return (await db.logTemplates.toArray()).sort((a, b) => a.name.localeCompare(b.name)); }
