import { getPeopleView, type PeopleView } from "./peopleCommands";
import { personNames } from "./dailyNoteQueries";
import { readSection, type SectionRead } from "./sectionRead";

/**
 * PEOPLE-PAGE-001 (APPS-PICKS-002 pick 9): one person, from records BEYOND already keeps — their yearly
 * dates (ordinary repeating commitments) and the facts you asked Alfred to keep. Read-only; a person is
 * a name you used, not a new stored record. Linked notes come from Connections.
 */
export interface PersonPage { name: string; dates: PeopleView["upcoming"]; facts: PeopleView["facts"]; gifts: PeopleView["facts"] }

const GIFT = /\b(gift|present|would love|wants|wishlist|wish list)\b/i;
const mentions = (text: string, name: string) => new RegExp(`(^|[^\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(text);

export async function getPeopleNames(now = new Date()): Promise<string[]> {
  return personNames(await getPeopleView(now)).sort((a, b) => a.localeCompare(b));
}

export function getPersonPage(name: string, now = new Date()): Promise<SectionRead<PersonPage>> {
  return readSection(async () => {
    const view = await getPeopleView(now);
    return {
      name,
      dates: view.upcoming.filter(({ reminder }) => mentions(reminder.title, name)),
      facts: view.facts.filter((fact) => mentions(fact.text, name) && !GIFT.test(fact.text)),
      // GIFTS-001 (APPS-PICKS-003 pick 30, after Monica): facts you kept that read as gift ideas.
      gifts: view.facts.filter((fact) => mentions(fact.text, name) && GIFT.test(fact.text)),
    };
  });
}
