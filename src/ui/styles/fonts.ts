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
 *
 * TYPOGRAPHY-001 (2026-09-10): --font-display's family swapped from Space
 * Grotesk to Big Shoulders Display, matching the BEYOND Launch Vision
 * prototype's "Terry's Suit" direction (direct owner decision). Same
 * weights (600/700), same self-hosting pattern — only the family changed.
 */
// big-shoulders-display's package.json exports map, unlike the other @fontsource packages
// below, has no explicit "./*.css" entry — only "./*" -> "./*.css". Importing with ".css"
// already in the specifier resolves to a nonexistent "*.css.css" and fails the production
// build; the extensionless form below is what this package's exports map actually supports.
import "@fontsource/big-shoulders-display/latin-600"; // .title
import "@fontsource/big-shoulders-display/latin-700"; // .command-title, .recommendation-title (BODY/TRAIN)
import "@fontsource/ibm-plex-sans/latin-400.css"; // body default, .card-body
import "@fontsource/ibm-plex-sans/latin-600.css"; // .card-body's existing inline font-weight:600 use
import "@fontsource/ibm-plex-mono/latin-400.css"; // .meta, .why-rule, .status-strip
import "@fontsource/ibm-plex-mono/latin-700.css"; // .eyebrow, .tool-label, .section-label, .why-group-label
