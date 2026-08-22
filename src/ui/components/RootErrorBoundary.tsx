import { Component, type ReactNode } from "react";

/**
 * Leverage Implementation 002 — root error containment (2026-08-22).
 *
 * Standing question answered: is BEYOND uniquely responsible for
 * catching a React render error? No — but the ruling ("use the
 * smallest mature solution unless a tiny owned boundary is materially
 * simpler") resolves to BUILD OWNED here, not react-error-boundary,
 * because:
 *
 * - React's error-boundary mechanism (`static getDerivedStateFromError`
 *   + `componentDidCatch`) IS the platform primitive, not a "solved
 *   problem" a library adds meaningful value on top of for this need.
 *   It has been stable public React API since React 16 with no
 *   indication of changing; using it directly is using the platform,
 *   not reinventing one.
 * - BEYOND's actual requirement is exactly one root boundary, one fixed
 *   BEYOND-styled fallback, one manual reset action. None of
 *   react-error-boundary's differentiating value (composable nested
 *   boundaries, `resetKeys`-driven automatic reset, the
 *   `useErrorBoundary` hook for imperatively throwing from async code,
 *   `withErrorBoundary`) is used or, per this checkpoint's own scope,
 *   wanted right now.
 * - The custom-styled BEYOND fallback screen — the actual BEYOND-
 *   specific work — has to be hand-built either way; a dependency here
 *   would only replace ~20 lines of stable class-component boilerplate,
 *   while adding a permanent line item to track for version bumps,
 *   license review, and supply-chain trust, forever.
 * - Net result: owning this ~20-line class component is the LOWER
 *   2-5 year maintenance burden, not the higher one — the opposite of
 *   the usual "adopt a library" case, because the platform primitive
 *   itself already fully solves BEYOND's actual (narrow) need.
 *
 * Deliberately minimal: no telemetry, no logging service, no automatic
 * reset-on-prop-change, no nested per-screen boundaries (this is a
 * single-purpose resilience checkpoint, not an observability project).
 * `componentDidCatch` only writes to the local browser console — never
 * a network call, matching local-first/offline-first doctrine.
 */

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  override state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: { componentStack?: string | null }): void {
    // Local console only — no remote telemetry, matching local-first doctrine.
    console.error("BEYOND encountered an application error:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

/**
 * Compact, BEYOND-styled recovery surface — reuses existing global.css
 * primitives (.screen/.eyebrow/.title/.card/.btn-primary/.btn-secondary)
 * verbatim rather than introducing new ones, per this checkpoint's own
 * "styling consistent enough not to look broken" scope, not a Suit Layer
 * expansion. Explains plainly what happened without inventing technical
 * detail (no fabricated stack trace, no invented diagnostics). Neither
 * action here touches Dexie, the service worker, or any backup — TRY
 * AGAIN only resets this component's own state; RELOAD APP is a plain
 * `location.reload()`, which re-runs the exact same already-installed
 * app and service worker, online or offline.
 */
function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="screen fade-in">
      <p className="eyebrow">BEYOND // SYSTEM</p>
      <h1 className="title">Something went wrong</h1>
      <div className="card" style={{ borderColor: "var(--border-strong)" }}>
        <p className="card-body" style={{ marginBottom: 12 }}>
          BEYOND encountered an application error and couldn&apos;t continue showing this screen.
          Nothing on this device has been changed or deleted — your data, backups, and offline access are exactly
          as they were.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onReset}>
            TRY AGAIN
          </button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => window.location.reload()}>
            RELOAD APP
          </button>
        </div>
      </div>
    </div>
  );
}
