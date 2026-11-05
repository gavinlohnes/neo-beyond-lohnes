import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { MoreSections, RecordedCount, Section, SectionEmpty, SectionUnavailable } from "../../src/ui/components/Section";
import { readSection, sectionValue } from "../../src/application/sectionRead";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });

it("gives every section an eyebrow, a plain heading and one way in, with a phone-sized target", async () => {
  const open = vi.fn();
  const screen = await render(<Section id="t" eyebrow="Your projects" title="Things you're building" wayIn={{ label: "Projects", onClick: open }}><p>One line.</p></Section>);
  await expect.element(screen.getByRole("region", { name: "Things you're building" })).toBeVisible();
  await expect.element(screen.getByText("Your projects")).toBeVisible();
  const button = screen.getByRole("button", { name: "Projects" });
  await button.click();
  expect(open).toHaveBeenCalledOnce();
  expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("says missing when a source is unavailable, and calm true words when it is empty", async () => {
  const screen = await render(<>
    <Section id="a" eyebrow="People" title="People who matter"><SectionUnavailable /></Section>
    <Section id="b" eyebrow="Plans" title="What matters next"><SectionEmpty line="A little breathing room." detail="No tasks planned or due in these records." /></Section>
  </>);
  await expect.element(screen.getByText("Records unavailable. Refresh to try again.")).toBeVisible();
  await expect.element(screen.getByText("A little breathing room.")).toBeVisible();
  expect(document.body.textContent).not.toMatch(/\b0\b/);
});

it("shows only recorded counts", async () => {
  const screen = await render(<RecordedCount done={2} total={3} unit="steps" />);
  await expect.element(screen.getByText("2 / 3 steps recorded", { exact: true })).toBeVisible();
  expect(screen.container.textContent).toBe("2 / 3 steps recorded");
});

it("folds the last 'more' sections until asked, and stays accessible", async () => {
  const screen = await render(<main><Section id="c" eyebrow="Now" title="Where you are" /><MoreSections><Section id="d" eyebrow="Later" title="Everything else" /></MoreSections></main>);
  const more = screen.container.querySelector("details")!;
  expect(more.open).toBe(false);
  await screen.getByText("More", { exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Everything else" })).toBeVisible();
  const result = await axe.run(screen.container);
  expect(result.violations).toEqual([]);
});

it("reads each section on its own: a failed source is unavailable, never empty", async () => {
  const ok = await readSection(async () => [1]);
  const failed = await readSection(async () => { throw new Error("nope"); });
  expect(ok).toEqual({ state: "ready", value: [1] });
  expect(failed).toEqual({ state: "unavailable" });
  expect(sectionValue(failed)).toBeNull();
});
