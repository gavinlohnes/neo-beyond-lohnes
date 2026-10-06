import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { EndDayCard } from "../../src/ui/screens/today/EndDayCard";
import { AdvisorySection } from "../../src/ui/screens/today/AdvisorySection";
import { FieldDisclosure } from "../../src/ui/components/FieldDisclosure";
import type { AdvisoryNote } from "../../src/domain/intelligence/types";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/** LAUNCH POLISH Drop (owner approval 2026-10-01): calmer TODAY, labels-only mono, neutral routine buttons. */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("Launch polish (real browser)", () => {
  it("TODAY's status reads as a line: no visible ORIENT label, no box on a GREEN day", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "Orient", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orient", level: 2 }).element().className).toBe("visually-hidden");
    const strip = document.querySelector(".status-strip--stacked") as HTMLElement;
    expect(strip).not.toBeNull();
    const style = getComputedStyle(strip);
    expect(style.borderLeftWidth).toBe("0px");
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("sentences use the body face; labels keep the mono face", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await render(<TodayScreen />);
    await expect.poll(() => document.querySelector(".meta")).not.toBeNull();
    expect(getComputedStyle(document.querySelector(".meta")!).fontFamily).toMatch(/Chakra Petch/); // HUD-001
    expect(getComputedStyle(document.querySelector(".tool-label, .section-label")!).fontFamily).toMatch(/JetBrains Mono/); // HUD-001
  });

  it("a suggested day end is a neutral row, not a red signal row", async () => {
    const screen = await render(
      <EndDayCard hasDay suggestEndDay endDayOpen={false} setEndDayOpen={() => {}} endDayBlockedByWorkout={false} busy={false} onEndDay={() => {}} />,
    );
    await expect.element(screen.getByRole("button", { name: "END DAY" })).toBeVisible();
    expect(document.querySelector(".signal-row")).toBeNull();
    expect(document.querySelector(".equipment-row")).not.toBeNull();
  });

  const quiet: AdvisoryNote = { id: "q", sourceModule: "decisionJournal", message: "Quiet note.", basis: [], attentionLevel: "QUIET" };
  const surface: AdvisoryNote = { id: "s", sourceModule: "decisionJournal", message: "Surfaced note.", basis: [], attentionLevel: "SURFACE" };

  it("QUIET-only advisory notes fold into one row", async () => {
    const folded = await render(<AdvisorySection notes={[quiet]} />);
    await expect.element(folded.getByRole("button", { name: "Open ADVISORY" })).toBeVisible();
    expect(folded.getByText("Quiet note.").elements()).toHaveLength(0);
  });

  it("a SURFACE note keeps the advisory section open", async () => {
    const open = await render(<AdvisorySection notes={[quiet, surface]} />);
    // ADVISORY-002: same-kind notes share one row; the notes sit one tap down.
    await expect.element(open.getByText("From your journal · 2 lessons")).toBeVisible();
    await open.getByText("SHOW").click();
    await expect.element(open.getByText("Surfaced note.")).toBeVisible();
    await expect.element(open.getByText("Quiet note.")).toBeVisible();
  });

  it("disclosures are quiet text rows, not grey button slabs", async () => {
    const screen = await render(
      <FieldDisclosure summary="SHOW MANUAL ENTRY" open={false} onToggle={() => {}}>
        <p>inside</p>
      </FieldDisclosure>,
    );
    const summary = screen.getByRole("button", { name: "SHOW MANUAL ENTRY" });
    await expect.element(summary).toBeVisible();
    expect(summary.element().className).toBe("disclosure-row");
    expect(summary.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("TRAIN leads with the suggested workout; the planned-work question sits below it", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    const start = screen.getByRole("button", { name: "START WORKOUT" });
    await expect.element(start).toBeVisible();
    const question = screen.getByText("Planning to train today?", { exact: true });
    await expect.element(question).toBeVisible();
    expect(start.element().compareDocumentPosition(question.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("MORE's routine settings are neutral buttons", async () => {
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("button", { name: "TURN ON" }).first()).toBeVisible();
    expect(screen.getByRole("button", { name: "TURN ON" }).first().element().className).toBe("btn-secondary");
    expect(screen.getByRole("button", { name: "EXPORT BACKUP" }).element().className).toBe("btn-secondary");
  });
});
