import { expect } from 'vitest';
import type { render } from 'vitest-browser-react';
import { SYSTEM_CAPABILITIES } from '../../../src/ui/systemCatalog';

type Screen = Pick<Awaited<ReturnType<typeof render>>, 'getByRole' | 'getByText'>;

/** Browse the production COMMAND groups. No state injection or hidden-control clicks. */
export async function commandResult(screen: Screen, label: string) {
  const search = screen.getByRole('searchbox', { name: 'Find a screen or action' });
  await expect.poll(() => search.elements().length || screen.getByRole('button', { name: 'COMMAND', exact: true }).elements().length || screen.getByRole('button', { name: 'BACK TO COMMAND', exact: true }).elements().length).toBeGreaterThan(0);
  if (!search.elements().length) {
    const tab = screen.getByRole('button', { name: 'COMMAND', exact: true });
    if (tab.elements().length) {
      await tab.click();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!search.elements().length) await tab.click();
    } else await screen.getByRole('button', { name: 'BACK TO COMMAND', exact: true }).click();
  }
  await expect.element(search).toBeVisible();
  if ((search.element() as HTMLInputElement).value) await search.fill('');
  const sectionForm = label === 'NUTRITION TARGETS' || label === 'QUIT TRACKER';
  if (sectionForm) {
    await openCommandPanel(screen, 'settings');
    return screen.getByRole('button', { name: `Open ${label}`, exact: true });
  }
  const canonical = label === 'SEARCH' ? 'SEARCH RECORDS' : label;
  const entry = SYSTEM_CAPABILITIES.find((item) => item.label === canonical);
  if (!entry) throw new Error(`Unknown COMMAND destination: ${label}`);
  const summary = screen.getByText(entry.group, { exact: true }).elements().find((element) => element.tagName === 'SUMMARY');
  if (!summary) throw new Error(`Missing COMMAND group: ${entry.group}`);
  // Click the element itself: a text locator for a job row ("On shift") can match the mode name too.
  if (!(summary.parentElement as HTMLDetailsElement).open) (summary as HTMLElement).click();
  await expect.poll(() => (summary.parentElement as HTMLDetailsElement).open).toBe(true);
  const result = screen.getByRole('button', { name: `${entry.label} ${entry.description}`, exact: true });
  await expect.element(result).toBeVisible();
  return result;
}
export async function openCommandDestination(screen: Screen, label: string) {
  await (await commandResult(screen, label)).click();
}
export async function openCommandPanel(screen: Screen, panel: 'backup' | 'settings') {
  // FIELD-AUTHORITY-001: the job rows "Backup & recovery" and "Settings" hold their tool panels.
  const summary = screen.getByText(panel === 'backup' ? 'Backup & recovery' : 'Settings', { exact: true }).elements().find((element) => element.tagName === 'SUMMARY');
  if (!summary) throw new Error(`Missing COMMAND panel: ${panel}`);
  if (!(summary.parentElement as HTMLDetailsElement).open) (summary as HTMLElement).click();
  await expect.poll(() => (summary.parentElement as HTMLDetailsElement).open).toBe(true);
}
