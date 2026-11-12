/**
 * PERF-001: toLocaleDateString / toLocaleString build a new Intl formatter on every call, which is slow when a list
 * formats hundreds of dates. This keeps one formatter per locale and options. Same output, including
 * "Invalid Date" for a date that can't be read.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(at: Date | string | number, locale: string | undefined, options: Intl.DateTimeFormatOptions): string {
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) return "Invalid Date";
  const key = `${locale ?? ""}\u0000${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) { formatter = new Intl.DateTimeFormat(locale, options); formatters.set(key, formatter); }
  return formatter.format(date);
}
