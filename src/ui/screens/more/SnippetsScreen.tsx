import { useEffect, useState } from "react";
import { deleteLogTemplate, deleteSnippet, saveLogTemplate, saveSnippet } from "../../../application/snippetCommands";
import { getLogTemplates, getSnippets } from "../../../application/snippetQueries";
import { readHelperContext } from "../../../application/helper/helperContext";
import { interpret } from "../../../application/helper/freeHelper";
import { describeProposal, type AlfredProposal } from "../../../application/alfred/alfredActions";
import type { LogTemplate, LogTemplateCard, TextSnippet } from "../../../domain/snippets/types";
import { announceSnippetsChanged } from "../../components/SnippetExpander";

const REPEATABLE = new Set<AlfredProposal["kind"]>(["log_meal", "log_water", "log_sleep", "log_weight", "log_urge", "clean_day"]);
const isLogTemplateCard = (proposal: AlfredProposal): proposal is LogTemplateCard => REPEATABLE.has(proposal.kind);

export function SnippetsScreen({ active }: { active: boolean }) {
  const [snippets, setSnippets] = useState<TextSnippet[]>([]), [templates, setTemplates] = useState<LogTemplate[]>([]);
  const [trigger, setTrigger] = useState(";"), [text, setText] = useState(""), [snippetId, setSnippetId] = useState<string>();
  const [name, setName] = useState(""), [instructions, setInstructions] = useState(""), [templateId, setTemplateId] = useState<string>();
  const [status, setStatus] = useState<string | null>(null), [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const load = async () => { const [s, t] = await Promise.all([getSnippets(), getLogTemplates()]); setSnippets(s); setTemplates(t); };
  useEffect(() => { if (active) void load(); }, [active]);
  async function submitSnippet() {
    setBusy(true); setStatus(null); try { await saveSnippet({ ...(snippetId ? { id: snippetId } : {}), trigger, text }); setTrigger(";"); setText(""); setSnippetId(undefined); await load(); announceSnippetsChanged(); setStatus("Snippet saved."); } catch (error) { setStatus(error instanceof Error ? error.message : "Snippet was not saved."); } finally { setBusy(false); }
  }
  async function submitTemplate() {
    setBusy(true); setStatus(null); try {
      const lines = instructions.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); if (!lines.length) throw new Error("Add at least one instruction, one per line.");
      const context = await readHelperContext(), cards: LogTemplateCard[] = [];
      for (const line of lines) { const result = interpret(line, { ...context, logTemplates: [] }); const card = result.cards[0]; if (result.unknown.length || result.cards.length !== 1 || !card || !isLogTemplateCard(card)) throw new Error(`Not a repeatable log card: ${line}`); cards.push(card); }
      await saveLogTemplate({ ...(templateId ? { id: templateId } : {}), name, cards }); setName(""); setInstructions(""); setTemplateId(undefined); await load(); setStatus("Log template saved. Its name now produces these confirmation cards.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Template was not saved."); } finally { setBusy(false); }
  }
  return <section className="snippets-screen" aria-labelledby="snippets-title">
    <header><p className="section-label">OPERATOR CONFIG</p><h1 id="snippets-title" tabIndex={-1}>SNIPPETS</h1><p>Expand short triggers in BEYOND text boxes, or make a named set of free-helper log cards. Cards still need SAVE.</p></header>
    {status && <p role="status" className="meta">{status}</p>}
    <section><h2>TEXT SNIPPETS</h2><p className="meta">Type the trigger followed by space or punctuation. One Backspace restores the trigger.</p>
      <div className="snippet-form"><label>Trigger<input className="input" value={trigger} disabled={busy} onChange={(event) => setTrigger(event.target.value)} placeholder=";shift" /></label><label>Expansion<textarea className="input" value={text} disabled={busy} onChange={(event) => setText(event.target.value)} /></label><button className="btn-primary" disabled={busy} onClick={() => void submitSnippet()}>{snippetId ? "SAVE CHANGES" : "SAVE SNIPPET"}</button>{snippetId && <button className="btn-secondary" onClick={() => { setSnippetId(undefined); setTrigger(";"); setText(""); }}>CANCEL EDIT</button>}</div>
      <ul className="snippet-list">{snippets.map((item) => <li key={item.id}><div><strong>{item.trigger}</strong><span>{item.text}</span></div><button className="btn-secondary" onClick={() => { setSnippetId(item.id); setTrigger(item.trigger); setText(item.text); }}>EDIT</button>{confirmDelete === item.id ? <><button className="btn-primary" onClick={() => void deleteSnippet(item.id).then(async () => { setConfirmDelete(null); await load(); announceSnippetsChanged(); })}>CONFIRM DELETE</button><button className="btn-secondary" onClick={() => setConfirmDelete(null)}>KEEP</button></> : <button className="btn-secondary" onClick={() => setConfirmDelete(item.id)}>DELETE</button>}</li>)}</ul>
    </section>
    <section><h2>LOG TEMPLATES</h2><p className="meta">One instruction per line. Use understood saved meals or exact amounts, such as “ate Protein shake” and “20 oz water”.</p>
      <div className="snippet-form"><label>Name<input className="input" value={name} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="usual pre-shift" /></label><label>Cards<textarea className="input" rows={4} value={instructions} disabled={busy} onChange={(event) => setInstructions(event.target.value)} /></label><button className="btn-primary" disabled={busy} onClick={() => void submitTemplate()}>{templateId ? "SAVE CHANGES" : "SAVE LOG TEMPLATE"}</button></div>
      <ul className="snippet-list">{templates.map((item) => <li key={item.id}><div><strong>{item.name}</strong>{item.cards.map((card, index) => <span key={index}>{describeProposal(card)}</span>)}</div>{confirmDelete === item.id ? <><button className="btn-primary" onClick={() => void deleteLogTemplate(item.id).then(async () => { setConfirmDelete(null); await load(); })}>CONFIRM DELETE</button><button className="btn-secondary" onClick={() => setConfirmDelete(null)}>KEEP</button></> : <button className="btn-secondary" onClick={() => setConfirmDelete(item.id)}>DELETE</button>}</li>)}</ul>
    </section>
  </section>;
}
