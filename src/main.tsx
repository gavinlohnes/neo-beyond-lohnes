import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
// Suit Implementation 01B: self-hosted webfonts — see fonts.ts's own
// doc comment. Side-effect import, no exports; must load before first
// paint, so it's imported at the very top of the app's entry module.
import "./ui/styles/fonts.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
