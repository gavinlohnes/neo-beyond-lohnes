# TODAY-OPERATOR-001 — browser evidence

Actual Chromium rendering of the production build at 320, 360 and 412 CSS px with an 800 px
viewport height and reduced motion. The isolated browser profiles contain only synthetic records
created through the product's existing controls; no personal records, prototype sample data or
new canonical rules are present.

| Width | Capture |
| --- | --- |
| 320 px | [TODAY command surface](today-320.png) |
| 360 px | [TODAY command surface](today-360.png) |
| 412 px | [TODAY command surface](today-412.png) |

The captures show the top of the transformed reading order: identity, current phase/context and
System Status without horizontal overflow. Browser regression exercises the complete journey,
including the single Engine recommendation, immediate operations, GREEN/AMBER/RED/NO READ, WHY,
manual controls, failures/retries, focus return, reduced motion, drafts and exactly-once writes.
Chromium evidence does not replace physical-device, Safari or screen-reader field validation.
