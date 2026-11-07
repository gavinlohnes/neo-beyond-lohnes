import { useEffect, useState } from "react";
import { getPersonPage, type PersonPage as Page } from "../../application/personQueries";
import type { SectionRead } from "../../application/sectionRead";
import { Connections } from "./Connections";
import { Section, SectionEmpty, SectionUnavailable } from "./Section";
import { askAlfred } from "./AlfredSheet";

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** PEOPLE-PAGE-001: one person — their dates, what you kept about them, and what links to them. Read-only. */
export function PersonPage({ name, onBack }: { name: string; onBack: () => void }) {
  const [read, setRead] = useState<SectionRead<Page> | null>(null);
  useEffect(() => { let current = true; setRead(null); void getPersonPage(name).then((next) => { if (current) setRead(next); }); return () => { current = false; }; }, [name]);
  const page = read?.state === "ready" ? read.value : null;
  return <section className="person-page" aria-label={`Person: ${name}`}>
    <button type="button" className="btn-secondary" onClick={onBack}>BACK TO PEOPLE</button>
    <p className="bx-eyebrow">PERSON</p>
    <h2 className="bx-title" tabIndex={-1}>{name}</h2>
    {!read ? <p className="meta" role="status">Reading what you kept…</p> : read.state === "unavailable" ? <SectionUnavailable /> : page && <>
      <Section id={`person-${name}-dates`} eyebrow="DATES" title="Coming round">
        {page.dates.length ? <ul className="bx-connection-list">{page.dates.map(({ reminder }) => <li key={reminder.id}><span className="person-row"><span>{reminder.title}</span><small>{reminder.dueAt ? shortDate(reminder.dueAt) : "No date"}</small></span></li>)}</ul>
          : <SectionEmpty line="No dates saved." detail="Add a birthday or anniversary in People." />}
      </Section>
      <Section id={`person-${name}-gifts`} eyebrow="GIFT IDEAS" title="For next time"
        wayIn={{ label: "Add an idea", onClick: () => askAlfred(`Remember a gift idea for ${name}: `) }}>
        {page.gifts.length ? <ul className="bx-connection-list">{page.gifts.map((fact) => <li key={fact.id}><span className="person-row"><span>{fact.text}</span></span></li>)}</ul>
          : <SectionEmpty line="No gift ideas kept yet." detail={`When one comes to you, tell Alfred: "Gift idea for ${name}: …"`} />}
      </Section>
      <Section id={`person-${name}-facts`} eyebrow="WHAT YOU KEPT" title="Things to remember">
        {page.facts.length ? <ul className="bx-connection-list">{page.facts.map((fact) => <li key={fact.id}><span className="person-row"><span>{fact.text}</span></span></li>)}</ul>
          : <SectionEmpty line="Nothing kept yet." detail={`Ask Alfred to remember something about ${name}.`} />}
      </Section>
    </>}
    <Connections id={`person-${name}-links`} label={name} />
  </section>;
}
