# W33 — Piloto Automático (Auto-Collect Toggle)

**Wave**: W33
**Status**: Implemented
**Date**: 2026-04-01
**Author**: FORGE Executor (Sonnet)

---

## Overview

W33 adds a persistent sidebar toggle — "Piloto Automático" — that runs a server-side
RSS collection + queue processing cycle every 35 minutes. The toggle survives page reloads
via `localStorage`. All behavior lives in a single hook (`useAutoPilot`) to keep App.tsx clean.

W33 is intentionally separate from the existing `autoRadar` / `runFullPipeline` mechanism (W30).
They can coexist without interference.

---

## Hook Interface

```typescript
// hooks/useAutoPilot.ts
export interface AutoPilotState {
  enabled: boolean;         // current on/off state
  toggle: () => void;       // flip state + persist to localStorage
  countdown: string;        // "MM:SS" until next collection
  lastRunTime: string;      // HH:MM of last successful cycle
  isRunning: boolean;       // true while cycle is in flight
  lastResult: string;       // e.g. "12 coletadas, 8 processadas"
}

export function useAutoPilot(): AutoPilotState;
```

---

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `INTERVAL_MS` | `2_100_000` (35 min) | Gap between automatic collection cycles |
| `COUNTDOWN_TICK_MS` | `1_000` (1 s) | How often the countdown display updates |
| `LS_KEY` | `'truepress_autopilot'` | localStorage key for persistence |

---

## Behavior

### ON → OFF (toggle)
1. `localStorage.setItem('truepress_autopilot', 'false')`
2. Countdown display disappears immediately.
3. Any in-flight cycle completes normally (does not abort).

### OFF → ON (toggle)
1. `localStorage.setItem('truepress_autopilot', 'true')`
2. `nextRunRef.current = Date.now()` — triggers a collection on the **next tick** (~1 s).
3. Countdown appears and counts down to 0, then restarts at 35:00.

### Cycle execution
Each cycle calls two Supabase Edge Function actions in sequence:
1. `callGeminiProxy('collect_rss', {})` — ingests new RSS items into the queue.
2. `callGeminiProxy('process_queue', { batchSize: 20 })` — processes up to 20 pending items.

`lastResult` is updated with: `"{collected} coletadas, {processed} processadas"`.

On error: `lastResult` = `"Erro: {first 40 chars of error message}"`. Timer resets normally.

### Persistence across reloads
- `useState(() => localStorage.getItem(LS_KEY) === 'true')` — restores ON state on mount.
- When restored as ON, `nextRunRef.current === 0` → set to `Date.now()` → immediate cycle.

---

## Sidebar Changes

### Location
The Piloto Automático widget is inserted in `components/Sidebar.tsx`:
- **After** the `data-testid="queue-stats-sidebar"` div
- **Before** the "Filtro de Relevância" section header

### New `SidebarProps` field

```typescript
autopilot: {
  enabled: boolean;
  toggle: () => void;
  countdown: string;
  lastRunTime: string;
  isRunning: boolean;
  lastResult: string;
};
```

### JSX structure (simplified)

```
<div data-testid="autopilot-status">
  <button data-testid="autopilot-toggle" onClick={autopilot.toggle}>
    [Bot|Loader2 icon] Piloto Automático   [ON|OFF badge]
  </button>
  {enabled && countdown && (
    <div data-testid="autopilot-countdown">Próxima coleta em MM:SS</div>
  )}
  {lastRunTime && (
    <div>Última coleta: HH:MM (N coletadas, M processadas)</div>
  )}
</div>
```

---

## `data-testid` Attributes (Playwright contract)

| `data-testid` | Element | Visible when |
|---------------|---------|--------------|
| `autopilot-toggle` | `<button>` | Always |
| `autopilot-status` | outer wrapper `<div>` | Always |
| `autopilot-countdown` | countdown `<div>` | Only when `enabled && countdown` |

---

## Integration Points

### App.tsx
```typescript
import { useAutoPilot } from './hooks/useAutoPilot';

// inside App():
const autopilot = useAutoPilot();

// passed to Dashboard:
<Dashboard ... autopilot={autopilot} />
```

### Dashboard.tsx
- Receives `autopilot` prop in `DashboardProps`
- Passes it through to `<Sidebar autopilot={autopilot} />`
- No other changes to Dashboard logic

---

## Lucide Icons

- `Bot` — used in toggle button (idle state). Already imported in Sidebar.tsx.
- `Loader2` — used in toggle button (running state). Already imported in Sidebar.tsx.

---

## Non-Goals (W33 scope boundary)

- Does NOT replace or modify `autoRadar` / `runFullPipeline` (W30).
- Does NOT add server-side scheduling (cron remains in Supabase / n8n).
- Does NOT implement retry logic beyond resetting the timer on error.
- Does NOT add notifications (handled separately if needed).
