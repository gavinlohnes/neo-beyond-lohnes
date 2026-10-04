import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Plain words (owner ruling 2026-10-04): no developer terms in text the
 * operator reads on TODAY, BODY, TRAIN, Weekly or History. Comments and
 * identifiers may say BeyondDay; on-screen text says "today" / "the day".
 * The "How BEYOND decided" machinery panel is technical by design and its
 * code doesn't contain these phrases.
 */
const SCREENS = ["src/ui/screens/today", "src/ui/screens/body", "src/ui/screens/train", "src/ui/screens/weekly", "src/ui/screens/history"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|ts)$/.test(name) ? [path] : [];
  });
}

/** Source with comments removed: block, JSX and line comments. */
function withoutComments(source: string): string {
  return source.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("plain words on screen", () => {
  it("no screen text says BeyondDay, 'deterministic' or STATE INPUT", () => {
    const offenders: string[] = [];
    for (const file of SCREENS.flatMap(files)) {
      const code = withoutComments(readFileSync(file, "utf8"));
      // Text-like occurrences only: inside quotes/template literals or between JSX tags — not types or identifiers.
      const patterns = [
        // inside quotes / template literals, or between JSX tags on one line
        /["'`>][^"'`<>\n]*\b(?:BeyondDay|BEYONDDAY|deterministic|STATE INPUT|Capacity is UNKNOWN)\b[^"'`<>\n]*["'`<]/g,
        // a JSX text line on its own, or text right after a {value}
        /(?:^[ \t]*|\})[^{}()<>=;:"'`\n]*\b(?:BeyondDay|BEYONDDAY|deterministic|STATE INPUT|Capacity is UNKNOWN)\b[^{}()<>=;"'`\n]*$/gm,
      ];
      for (const pattern of patterns) {
        for (const match of code.matchAll(pattern)) {
          const text = match[0].replace(/^[}"'`>]|["'`<]$/g, "").trim();
          // A lone identifier (an import or type list entry) isn't on-screen text.
          if (/^[A-Za-z_$][\w$]*,?$/.test(text)) continue;
          offenders.push(`${file}: ${text}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
