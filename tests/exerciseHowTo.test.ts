import { afterEach, describe, expect, it } from "vitest";
import { EXERCISE_LIBRARY } from "../src/domain/workout/exerciseLibrary";
import { ACE_LIBRARY_PREFIX, EXERCISE_HOW_TO, howToFor, TEMPLATE_TO_LIBRARY_ID } from "../src/domain/workout/exerciseHowTo";
import { effectiveHowTo, resetHowTo, writeHowToEdit } from "../src/ui/screens/train/exerciseHowToStore";
import { TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";

/** GRAYSON-TRAIN-HOWTO-001: a how-to for every library exercise; the ten built-ins moved unchanged; his edits win. */
// The ten guides exactly as CalibrationPreview.tsx held them before this change.
const ORIGINAL_TEN: Record<string, { role: string; setup: string; cues: string[]; mistakes: string[]; alternatives: string }> = {
  "machine-chest-press": { role: "Horizontal press · chest and triceps", setup: "Set the seat so the handles begin around mid-chest. Keep your upper back supported and feet planted.", cues: ["Shoulders stay down and back", "Press without bouncing", "Finish under control"], mistakes: ["Seat too high or low", "Shoulders rolling forward"], alternatives: "Dumbbell or barbell bench press · at home: an appropriate push-up level" },
  "pec-deck": { role: "Chest isolation", setup: "Adjust the seat so your upper arms line up near chest height. Begin with a comfortable stretch.", cues: ["Chest stays tall", "Move the upper arms together", "Return slowly"], mistakes: ["Reaching with the hands", "Forcing an excessive stretch"], alternatives: "Cable fly · at home: push-up" },
  "leg-press": { role: "Knee-dominant legs", setup: "Place both feet securely on the platform and choose a depth you can control without your hips lifting.", cues: ["Knees follow the toes", "Keep the whole foot planted", "Do not slam the stops"], mistakes: ["Knees collapsing inward", "Lower back leaving the pad"], alternatives: "Squat or supported lunge · at home: chair squat" },
  "triceps-pressdown": { role: "Direct triceps work", setup: "Stand stable with elbows beside your body and the cable under control before starting.", cues: ["Elbows stay quiet", "Extend without swinging", "Return with control"], mistakes: ["Using the torso for momentum", "Letting elbows drift forward"], alternatives: "Overhead cable extension · at home: close-grip incline push-up" },
  "lat-pulldown": { role: "Vertical pull · back and arms", setup: "Secure your thighs, take a comfortable grip and begin with your torso tall.", cues: ["Pull elbows toward your sides", "Keep the chest tall", "Control the return"], mistakes: ["Pulling behind the neck", "Turning it into a large body swing"], alternatives: "Assisted pull-up · no honest equipment-free loaded-pull equivalent" },
  "seated-cable-row": { role: "Horizontal pull · back and arms", setup: "Sit braced with a neutral torso and begin with the cable taut.", cues: ["Lead with the elbows", "Finish without shrugging", "Reach forward under control"], mistakes: ["Repeatedly rocking the torso", "Shoulders rising toward the ears"], alternatives: "One-arm dumbbell row · at home: prone Y-T-W for scapular movement, not equivalent load" },
  "leg-curl": { role: "Knee flexion · hamstrings", setup: "Align the machine pivot with your knee and secure the pad without pinching.", cues: ["Keep hips against the pad", "Curl smoothly", "Control the return"], mistakes: ["Lifting the hips", "Dropping the weight stack"], alternatives: "Romanian deadlift · at home: bridge walkout" },
  "preacher-curl": { role: "Direct elbow flexion · arms", setup: "Set the seat so your upper arms rest fully on the pad without reaching.", cues: ["Upper arms stay planted", "Curl without bouncing", "Lower under control"], mistakes: ["Lifting the elbows", "Snapping into full extension"], alternatives: "Dumbbell or hammer curl · at home: defer direct loaded curl work" },
  "machine-shoulder-press": { role: "Vertical press · shoulders and triceps", setup: "Set the seat so the handles begin around shoulder height and your back remains supported.", cues: ["Ribs stay controlled", "Press smoothly", "Lower to a comfortable depth"], mistakes: ["Overarching the lower back", "Forcing painful depth"], alternatives: "Dumbbell shoulder press · at home: elevated pike push-up if appropriate" },
  "reverse-pec-deck": { role: "Rear shoulders and upper back", setup: "Face the pad with handles near shoulder height and keep the chest supported.", cues: ["Move from the shoulders", "Keep the neck relaxed", "Return slowly"], mistakes: ["Shrugging", "Using momentum"], alternatives: "Face pull or rear-delt raise · at home: prone Y-T-W" },
};

afterEach(() => localStorage.clear());

describe("GRAYSON-TRAIN-HOWTO-001 guides", () => {
  it("covers all 64 library exercises (54, plus GRAYSON-HOME-STRETCH-001's ten home moves) with a role, setup, exactly three cues and one or two mistakes", () => {
    expect(EXERCISE_LIBRARY).toHaveLength(64);
    expect(Object.keys(EXERCISE_HOW_TO).sort()).toEqual(EXERCISE_LIBRARY.map((e) => e.id).sort());
    for (const lib of EXERCISE_LIBRARY) {
      const g = EXERCISE_HOW_TO[lib.id]!;
      expect(g.role.trim(), lib.id).not.toBe("");
      expect(g.setup.trim(), lib.id).not.toBe("");
      expect(g.cues, lib.id).toHaveLength(3);
      expect(g.mistakes.length, lib.id).toBeGreaterThanOrEqual(1);
      expect(g.mistakes.length, lib.id).toBeLessThanOrEqual(2);
      expect(g.alternatives.trim(), lib.id).not.toBe("");
    }
  });

  it("maps the ten built-ins to library ids with their text unchanged", () => {
    // GRAYSON-HOME-STRETCH-001 adds the two HOME moves that are library moves already.
    expect(Object.keys(TEMPLATE_TO_LIBRARY_ID).sort()).toEqual([...Object.keys(ORIGINAL_TEN), "home-glute-bridge", "home-plank"].sort());
    for (const [templateId, original] of Object.entries(ORIGINAL_TEN)) {
      const libId = TEMPLATE_TO_LIBRARY_ID[templateId]!;
      expect(EXERCISE_LIBRARY.some((e) => e.id === libId), libId).toBe(true);
      const { videoUrl: _link, ...text } = howToFor(templateId)!;
      expect(text, templateId).toEqual(original);
    }
  });

  it("links only to ACE Exercise Library pages", () => {
    for (const [id, g] of Object.entries(EXERCISE_HOW_TO)) if (g.videoUrl) expect(g.videoUrl, id).toMatch(new RegExp(`^${ACE_LIBRARY_PREFIX.replace(/[.]/g, "\\.")}\\d+/[a-z0-9-]+/$`));
  });

  it("lets his edits win, and RESET restores the bundled guide", () => {
    const id = "lib-pushup";
    expect(effectiveHowTo(id)!.edited).toBe(false);
    expect(writeHowToEdit(id, { setup: "My setup", cues: ["One", "Two", "Three"], videoUrl: "https://example.org/pushup" })).toBe(true);
    const mine = effectiveHowTo(id)!;
    expect(mine).toMatchObject({ setup: "My setup", cues: ["One", "Two", "Three"], videoUrl: "https://example.org/pushup", edited: true, bundledVideo: false });
    expect(mine.mistakes).toEqual(EXERCISE_HOW_TO[id]!.mistakes);
    // Clearing the link on an exercise that has one.
    writeHowToEdit("lib-lat-pulldown", { videoUrl: "" });
    expect(effectiveHowTo("lib-lat-pulldown")!.videoUrl).toBeUndefined();
    expect(resetHowTo(id)).toBe(true);
    expect(effectiveHowTo(id)).toMatchObject({ setup: EXERCISE_HOW_TO[id]!.setup, edited: false });
    // A non-https link or junk in storage is ignored.
    localStorage.setItem("beyond.exerciseHowTo.v1", JSON.stringify({ "lib-plank": { videoUrl: "javascript:alert(1)", cues: [1, 2] } }));
    expect(effectiveHowTo("lib-plank")!.edited).toBe(false);
    localStorage.setItem("beyond.exerciseHowTo.v1", "{not json");
    expect(effectiveHowTo("lib-plank")!.edited).toBe(false);
  });

  it("travels with the backup and has no guide for unknown or custom exercises", () => {
    expect(TRAVELLING_SETTINGS["beyond.exerciseHowTo.v1"]).toBe("Exercise how-to edits");
    expect(howToFor("custom-1234")).toBeNull();
    expect(effectiveHowTo("custom-1234")).toBeNull();
  });
});
