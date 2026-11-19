# METRIC-CHANGE-001 — design preview

Open [the interactive preview](index.html) in a browser. All data is invented; there are no external requests or saved changes. Embedded existing BEYOND fonts retain their SIL OFL notices.

## Proposed improvement

Add one compact “What changed” comparison after the existing metric context, with optional evidence. Existing pages already provide a 90-day direction and work/off medians: this proposal adds a recent-period comparison, not another long-term trend.

Compare the last seven finished lived days with the preceding seven. Exclude the current partial day. This is a design example, **not approval of a production aggregation formula, eligibility threshold, range rule, or context-adjustment policy**. Surrounding metric layout is simplified for review.

## Four examples

- **Water:** 48 → 56 oz per logged day, six recorded days in each period. More water *logged* does not prove more water consumed. Gaps are not zero.
- **Steps:** work/off proportions changed. Withhold the pooled headline; show same-context medians and counts in evidence, without claiming a cause.
- **Weight:** one recent and two previous readings. Withhold a comparison; the production sufficiency rule remains undecided.
- **No records:** show an honest empty state, never zero intake or a fabricated trend.

Use the scenario selector and show/hide control to judge whether the addition earns its space. Evidence exposes every synthetic daily value and its source. Promotion, logging, correction and navigation are not implemented in this mock.

## Review recommendation

Judge the compact comparison and expandable evidence first. If useful, define production metric eligibility and calculation rules in a separate bounded implementation brief before changing app code. Do not approve all example formulas implicitly by accepting the visual concept.

## Evidence

- [Phone](phone.png), [desktop](desktop.png), [changed-context evidence](context-evidence.png).
- Playwright checked all four states at 320, 375, 768 and 1024 pixels: no horizontal overflow, 14 evidence rows per state, no script errors.
- axe found no automated accessibility violations in those 16 combinations; this does not replace manual assistive-technology testing.
- Comparison arithmetic, same-context medians, and show/hide behavior checked. Phone screenshot inspected visually.
- No production files changed; application test suites/build were not rerun for this isolated static preview. CI is reported separately on the PR.
