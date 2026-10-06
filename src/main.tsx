import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { BootSequence } from "./ui/components/BootSequence";
// Suit Implementation 01B: self-hosted webfonts — see fonts.ts's own
// doc comment. Side-effect import, no exports; must load before first
// paint, so it's imported at the very top of the app's entry module.
import "./ui/styles/fonts.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* BOOT-001: the cold-launch boot sequence, over the app while it starts. Here, not in App,
        so it plays once per page load and never on a re-render or resume. */}
    <BootSequence />
  </StrictMode>,
);
