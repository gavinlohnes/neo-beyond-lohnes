/**
 * BEYOND Suit Implementation 01B (2026-08-22) — Part 6: resolves the
 * font-loading gap found in 01A. index.html never loaded any font by
 * any mechanism, so --font-display/--font-body/--font-mono always
 * silently fell through to system-ui/ui-monospace on every real device.
 *
 * Self-hosted via @fontsource (OFL-1.1, mature, single-purpose — this is
 * the standard, maintained way to bundle correctly-subsetted webfont
 * files for offline-first apps; hand-rolling font subsetting/hosting
 * would be BEYOND uniquely reinventing an already-solved problem).
 * Latin-only subsets only (BEYOND is English-only today) to keep the
 * service-worker precache set small. Only the weights actually used by
 * an existing CSS rule are imported — see each token/class's own
 * font-weight. Imported once here, from main.tsx, so Vite's normal JS
 * asset pipeline resolves and hashes the referenced .woff2 files (copied
 * into dist/assets/, then precached — see vite.config.ts's explicit
 * workbox.globPatterns woff2 entry).
 */
import "@fontsource/space-grotesk/latin-600.css"; // .title
import "@fontsource/space-grotesk/latin-700.css"; // .command-title, .recommendation-title (BODY/TRAIN)
import "@fontsource/ibm-plex-sans/latin-400.css"; // body default, .card-body
import "@fontsource/ibm-plex-sans/latin-600.css"; // .card-body's existing inline font-weight:600 use
import "@fontsource/ibm-plex-mono/latin-400.css"; // .meta, .why-rule, .status-strip
import "@fontsource/ibm-plex-mono/latin-700.css"; // .eyebrow, .tool-label, .section-label, .why-group-label
