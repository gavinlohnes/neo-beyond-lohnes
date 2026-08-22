// Factory Drop 02 — version/build truth. These three constants are the
// single source MORE/SYSTEM (and anything else) reads deployed-software
// identity from. Each is baked in at build time by vite.config.ts's
// `define`, not re-typed by hand here or anywhere downstream.
//
// APP_RELEASE is the deliberate, human-bumped semantic release identity —
// see README.md's "Versions & lineage" for why its current value is what
// it is and why bumping it is a real decision, not a build artifact.
// BUILD_COMMIT/BUILD_TIME are fully derived from the actual build
// environment and answer a different question: not "what release is
// this," but "what exact code is actually running right now" — the one
// thing a manually-bumped release number can never guarantee on its own.
export const APP_RELEASE = __APP_RELEASE__;
export const BUILD_COMMIT = __BUILD_COMMIT__;
export const BUILD_TIME = __BUILD_TIME__;
