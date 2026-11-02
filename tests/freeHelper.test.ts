import { describe, expect, it } from "vitest";
import { clauses, interpret, isQuestion, type HelperContext } from "../src/application/helper/freeHelper";

/** FREE-HELPER-001: the free helper understands common phrasings and refuses to guess. Invented data. */
const ctx: HelperContext = {
  now: new Date(2026, 10, 2, 12), // Mon Nov 2 2026
  savedMeals: [
    { id: "m1", name: "Chicken bowl", calories: 650, proteinG: 48 },
    { id: "m2", name: "Protein shake", calories: 220, proteinG: 40 },
    { id: "m3", name: "Chicken wrap", calories: 500, proteinG: 35 },
  ],
  openTasks: [{ id: "t1", title: "Call the bank" }, { id: "t2", title: "Book a tip run" }],
  openProjects: [{ id: "p1", title: "Clear the garage" }],
  routines: [{ id: "r1", title: "Pre-shift", steps: [{ id: "s1", text: "Shower" }, { id: "s2", text: "Lay out uniform" }] }],
};
const one = (text: string) => { const r = interpret(text, ctx); expect(r.unknown).toEqual([]); expect(r.cards).toHaveLength(1); return r.cards[0]; };
const none = (text: string) => { const r = interpret(text, ctx); expect(r.cards).toEqual([]); expect(r.unknown).toEqual([text]); };

describe("logging", () => {
  it("water, in oz, ml or litres", () => {
    expect(one("16 oz water")).toEqual({ kind: "log_water", oz: 16 });
    expect(one("drank 20oz")).toEqual({ kind: "log_water", oz: 20 });
    expect(one("500 ml water")).toEqual({ kind: "log_water", oz: 17 });
    expect(one("1 l water")).toEqual({ kind: "log_water", oz: 34 });
  });
  it("weight and sleep", () => {
    expect(one("weight 212")).toEqual({ kind: "log_weight", lbs: 212 });
    expect(one("212.4 lbs")).toEqual({ kind: "log_weight", lbs: 212.4 });
    expect(one("slept 6h")).toEqual({ kind: "log_sleep", minutes: 360, nap: false });
    expect(one("slept 6 hours 30")).toEqual({ kind: "log_sleep", minutes: 390, nap: false });
    expect(one("nap 40 min")).toEqual({ kind: "log_sleep", minutes: 40, nap: true });
  });
  it("work, quit tracker and notes", () => {
    expect(one("at work")).toEqual({ kind: "work_started" });
    expect(one("off work")).toEqual({ kind: "work_ended" });
    expect(one("clean day")).toEqual({ kind: "clean_day" });
    expect(one("urge, stress")).toEqual({ kind: "log_urge", trigger: "STRESS" });
    expect(one("urge after work")).toEqual({ kind: "log_urge", trigger: "AFTER_SHIFT" });
    expect(one("note: ask HR about overtime, and the badge")).toEqual({ kind: "capture_note", text: "ask HR about overtime, and the badge" });
  });
  it("a full check-in, never a partial one", () => {
    expect(one("energy 3 stress 4 mood 3 soreness 1 urge 0")).toEqual({ kind: "check_in", energy: 3, stress: 4, mood: 3, soreness: 1, alcohol_urge: 0 });
    none("energy 3 stress 4");
  });
  it("saved meals by name, with servings; unknown foods go to Alfred", () => {
    expect(one("ate the chicken bowl")).toMatchObject({ kind: "log_meal", saved_meal_id: "m1", servings: 1, calories: 650, protein_g: 48 });
    expect(one("2 protein shakes")).toMatchObject({ kind: "log_meal", saved_meal_id: "m2", servings: 2, calories: 440, protein_g: 80 });
    expect(one("burger 650 cal 30g protein")).toEqual({ kind: "log_meal", name: "burger", calories: 650, protein_g: 30 });
    none("ate a burger");
    none("ate chicken"); // two saved meals match: ambiguous
    none("burger 650 cal"); // no protein given; never made up
  });
  it("several things in one sentence", () => {
    const r = interpret("16 oz water, the chicken bowl and slept 6h", ctx);
    expect(r.unknown).toEqual([]);
    expect(r.cards.map((c) => c.kind)).toEqual(["log_water", "log_meal", "log_sleep"]);
    const mixed = interpret("16 oz water and something weird", ctx);
    expect(mixed.cards.map((c) => c.kind)).toEqual(["log_water"]);
    expect(mixed.unknown).toEqual(["something weird"]);
  });
});

describe("tasks and plans", () => {
  it("reminders with a date, a time or a repeat", () => {
    expect(one("remind me to call the bank Friday")).toMatchObject({ kind: "add_reminder", title: "Call the bank", due_date: "2026-11-06" });
    expect(one("remind me to call mom and dad tomorrow at 9:30am")).toMatchObject({ kind: "add_reminder", title: "Call mom and dad", due_date: "2026-11-03", when_note: "09:30" });
    expect(one("remind me to pay the car every 15th")).toMatchObject({ kind: "add_reminder", title: "Pay the car", due_date: "2026-11-15", repeat_rrule: "FREQ=MONTHLY;BYMONTHDAY=15" });
    expect(one("remind me to put the bins out every monday")).toMatchObject({ kind: "add_reminder", title: "Put the bins out", repeat_rrule: "FREQ=WEEKLY;BYDAY=MO" });
    none("remind me to pay rent every 31st");
  });
  it("done, move and plan an open task by its name", () => {
    expect(one("done: call the bank")).toEqual({ kind: "task_done", task_id: "t1", title: "Call the bank" });
    expect(one("call the bank is done")).toEqual({ kind: "task_done", task_id: "t1", title: "Call the bank" });
    expect(one("move tip run to Thursday")).toEqual({ kind: "task_new_date", task_id: "t2", title: "Book a tip run", due_date: "2026-11-05" });
    expect(one("plan tip run for wednesday")).toEqual({ kind: "task_plan", task_id: "t2", title: "Book a tip run", planned_date: "2026-11-04" });
    none("done: renew passport");
  });
  it("project steps and routine ticks", () => {
    expect(one("add step to garage: buy shelves")).toEqual({ kind: "add_reminder", title: "Buy shelves", project_id: "p1", project_title: "Clear the garage" });
    expect(one("ticked shower")).toEqual({ kind: "routine_tick", routine_id: "r1", step_id: "s1", text: "Shower", routine_title: "Pre-shift" });
    expect(one("did lay out uniform")).toMatchObject({ kind: "routine_tick", step_id: "s2" });
    none("add step to shed: paint it");
  });
});

it("tells questions from logs, and keeps reminders whole", () => {
  expect(isQuestion("how did I sleep this week")).toBe(true);
  expect(isQuestion("filter size?")).toBe(true);
  expect(isQuestion("16 oz water")).toBe(false);
  expect(clauses("remind me to call mom and dad")).toEqual(["remind me to call mom and dad"]);
  expect(clauses("20 oz water, and remind me to call mom and dad")).toEqual(["20 oz water", "remind me to call mom and dad"]);
  none("plan my whole life");
  none("I feel off today");
});

describe("refuses to guess (review of #366)", () => {
  const withOats: HelperContext = { ...ctx, savedMeals: [...ctx.savedMeals, { id: "m4", name: "Oats", calories: 300, proteinG: 10 }] };
  it("negations and loose meal matches make no card", () => {
    none("skipped the chicken bowl");
    none("didn't eat the chicken bowl");
    none("don't remind me to pay the car");
    const r = interpret("ate oats with honey", withOats);
    expect(r.cards).toEqual([]);
  });
  it("urges, water and times it isn't sure about", () => {
    none("urge to quit my job");
    none("urge 4");
    none("16 oz");
    none("remind me to call mom tomorrow at 5");
    none("move tip run to thursday at 3pm");
    none("remind me to");
    none("done: car");
    none("burger 650 cal -30g protein");
  });
});
