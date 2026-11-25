# GRAYSON-TRAIN-BODYMAP-001 — tap a muscle to find its exercises (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-TRAIN-BODYMAP-001.md) approves these.

- **Original artwork:** the front and back figures are BEYOND's own, drawn from simple rectangles and ellipses in
  its line style, and traced from no app's figure. We copy MuscleWiki's behaviour (tap a muscle, see its exercises),
  not its art.
- **Navigation only:** no colour grades anything, and there's no coverage or "muscle growth" score (TRAIN
  intelligence §8: "never a grown map"). The selected region is outlined. Every region is also a button with its
  count, so the figure is never the only way in.
- **Eight groups, and why:** they are the library's own groups (Chest, Back, Shoulders, Arms, Core, Legs, Glutes,
  Full Body). No finer muscles or secondary muscles, so every exercise sits in exactly one place and nothing new has
  to be classified.
- **The swap stays free text:** FIND BY MUSCLE opens on the current exercise's group and fills the existing
  substitution field with the exercise's name, exactly as a quick-pick does. Nothing new is stored.
- **His to change:** his own exercises' groups (through the existing custom exercise edit) and his equipment chips.
  The chips are a view setting in `beyond.bodyMap.v1`, kept on this phone.
