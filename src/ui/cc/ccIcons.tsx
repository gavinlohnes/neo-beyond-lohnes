/**
 * POLISH-002: the command-center prototype's icon set (prototype/command-center/index.html, `I`),
 * as components. Monochrome; color comes from currentColor.
 */
const svg = (w: number, h: number, children: React.ReactNode) =>
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">{children}</svg>;

export const CcIcon = {
  emblem: () => svg(22, 22, <><path d="M11 1.5 20.5 11 11 20.5 1.5 11Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 6.5 15.5 11 11 15.5 6.5 11Z" fill="currentColor" /></>),
  today: () => svg(20, 20, <path d="M10 2 18 10 10 18 2 10Z" fill="none" stroke="currentColor" strokeWidth="1.5" />),
  train: () => svg(22, 20, <path d="M2 10h18M5 6v8M17 6v8M3 8v4M19 8v4" stroke="currentColor" strokeWidth="1.5" fill="none" />),
  body: () => svg(20, 20, <><path d="M10 2 17 6v8l-7 4-7-4V6Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" /></>),
  command: () => svg(20, 20, <><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.5" /></>),
  water: () => svg(18, 18, <path d="M9 2 14 9.5a5 5 0 1 1-10 0Z" fill="none" stroke="currentColor" strokeWidth="1.5" />),
  meal: () => svg(18, 18, <path d="M5 2v6a2 2 0 0 0 2 2v6M3 2v5M7 2v5M13 2c-2 2-2 6 0 7v7" fill="none" stroke="currentColor" strokeWidth="1.5" />),
  plus: () => svg(16, 16, <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" />),
  back: () => svg(16, 16, <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />),
  check: () => svg(18, 18, <><rect x="2.5" y="2.5" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m5.5 9 2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></>),
  moon: () => svg(18, 18, <path d="M14 11.5A6 6 0 0 1 6.5 4a6 6 0 1 0 7.5 7.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />),
  clock: () => svg(18, 18, <><circle cx="9" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M9 5v4l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" /></>),
  note: () => svg(18, 18, <path d="M3 3h12v8l-4 4H3Z M11 15v-4h4" fill="none" stroke="currentColor" strokeWidth="1.5" />),
  list: () => svg(18, 18, <path d="M6 5h9M6 9h9M6 13h9M3 5h.5M3 9h.5M3 13h.5" stroke="currentColor" strokeWidth="1.5" />),
};
