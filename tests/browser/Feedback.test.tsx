import { afterEach, describe, expect, it, vi } from "vitest";
import { captureCommitFeedback, feedback } from "../../src/ui/feel/feedback";
import { haptic } from "../../src/ui/feel/haptics";

const originalVibrate = Object.getOwnPropertyDescriptor(navigator, "vibrate");
afterEach(() => {
  vi.restoreAllMocks();
  if (originalVibrate) Object.defineProperty(navigator, "vibrate", originalVibrate);
  else Reflect.deleteProperty(navigator, "vibrate");
  document.querySelectorAll("[data-feedback-test]").forEach((node) => node.remove());
});
function motion(reduced: boolean) {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => query === "(prefers-reduced-motion: reduce)"
    ? { ...original(query), matches: reduced } as MediaQueryList : original(query));
}
function vibration(value: unknown) {
  Object.defineProperty(navigator, "vibrate", { configurable: true, value });
}
function control() {
  const button = document.createElement("button");
  button.dataset.feedbackTest = ""; button.textContent = "LOG";
  document.body.append(button); button.focus(); return button;
}
describe("SUIT feedback", () => {
  it("uses stable light, medium, heavy and arm meanings; arming has no success pulse", async () => {
    motion(false); const vibrate = vi.fn(); vibration(vibrate); const button = control();
    feedback("ARMED"); expect(button.classList.contains("commit-pulse")).toBe(false);
    feedback("LIGHT", button); expect(button.classList.contains("commit-pulse")).toBe(true);
    haptic("SET_LOGGED"); feedback("HEAVY");
    expect(vibrate.mock.calls.map(([pattern]) => pattern)).toEqual([8, 10, 20, 35]);
    await new Promise((resolve) => setTimeout(resolve, 160));
    expect(button.classList.contains("commit-pulse")).toBe(false);
  });
  it("keeps reduced-motion completely quiet", () => {
    motion(true); const vibrate = vi.fn(); vibration(vibrate); const button = control();
    for (const meaning of ["LIGHT", "MEDIUM", "HEAVY", "ARMED"] as const) feedback(meaning);
    expect(vibrate).not.toHaveBeenCalled(); expect(button.classList.contains("commit-pulse")).toBe(false);
  });
  it("retains visual confirmation if vibration is absent or refused", () => {
    motion(false); const button = control();
    vibration(undefined); expect(() => feedback("LIGHT", button)).not.toThrow();
    expect(button.classList.contains("commit-pulse")).toBe(true);
    vibration(() => { throw new Error("Not permitted"); });
    expect(() => feedback("HEAVY", button)).not.toThrow();
  });
  it("keeps the originating control when focus moves during an async save", () => {
    motion(false); vibration(vi.fn());
    const original = control(); const acknowledge = captureCommitFeedback(); const navigation = control();
    acknowledge("LIGHT");
    expect(original.classList.contains("commit-pulse")).toBe(true);
    expect(navigation.classList.contains("commit-pulse")).toBe(false);
  });

});
