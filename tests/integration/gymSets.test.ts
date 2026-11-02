import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { abandonWorkout, startWorkout } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { interpret } from "../../src/application/helper/freeHelper";
import { confirmProposal } from "../../src/application/alfred/alfredActions";

/** GYM-SETS-001: sets by plain words, only into the workout in progress, never guessed. Invented data. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("logs 'name weight x reps' as the next set of that exercise in the active workout", async () => {
  const day = await startDay();
  const session = await startWorkout(day.id, "A", "STANDARD");
  const ctx = await readHelperContext();
  expect(ctx.workout?.sessionId).toBe(session.id);
  const first = ctx.workout!.exercises[0]!;
  const words = first.name.toLowerCase();
  const r = interpret(`${words} 135 x 8`, ctx);
  expect(r.unknown).toEqual([]);
  expect(r.cards).toEqual([{ kind: "log_set", session_id: session.id, exercise_id: first.id, exercise_name: first.name, weight: 135, reps: 8 }]);
  await confirmProposal(r.cards[0]!);
  await confirmProposal(interpret(`${words} 135 for 7`, ctx).cards[0]!);
  const sets = (await getPerformedSets(session.id)).filter((s) => s.exerciseId === first.id);
  expect(sets.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([[1, 135, 8], [2, 135, 7]]);
});

it("no workout, unknown lift or silly numbers: no card", async () => {
  const day = await startDay();
  expect(interpret("bench 135 x 8", await readHelperContext()).cards).toEqual([]);
  const session = await startWorkout(day.id, "A", "STANDARD");
  const ctx = await readHelperContext();
  expect(interpret("zercher carry 135 x 8", ctx).cards).toEqual([]);
  expect(interpret("chest press 140 x 10", ctx).cards[0]).toMatchObject({ exercise_id: "machine-chest-press", weight: 140, reps: 10 }); // the lift's own words
  expect(interpret(`${ctx.workout!.exercises[0]!.name} 135 x 0`, ctx).cards).toEqual([]);
  const card = interpret(`${ctx.workout!.exercises[0]!.name} 135 x 8`, ctx).cards[0]!;
  await abandonWorkout(day.id, session.id, "STANDARD");
  await expect(confirmProposal(card)).rejects.toThrow("WORKOUT_NOT_ACTIVE");
});
