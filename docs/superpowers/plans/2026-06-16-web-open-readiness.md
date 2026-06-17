# Web Open Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare `poop-dodge-3d` for a web-open review by adding sound settings, browser QA fixes, build-warning analysis, and updated operating documentation without deploying.

**Architecture:** Keep gameplay logic intact and add readiness work around it. Sound preference lives in a small storage module and gates `src/game/audio.ts`; the app owns the setting and passes it into `GameOverlay`; CSS changes keep HUD/results usable at the approved QA viewports; documentation records what is verified and what remains risky.

**Tech Stack:** Vite, React, TypeScript, React Three Fiber, Three.js, Vitest, ESLint, Socket.IO.

---

## File Structure

- Create `src/game/storage/soundPreference.ts`: read/write sound enabled preference with localStorage fallback.
- Create `src/game/storage/soundPreference.test.ts`: storage behavior tests.
- Modify `src/game/audio.ts`: add a module-level sound enabled gate and export `setGameSoundEnabled()`.
- Modify `src/game/audio.test.ts`: test that sound off prevents audio context construction.
- Modify `src/app/App.tsx`: initialize sound preference, wire sound state into audio layer, pass toggle props to overlay, and optionally lazy-load `GameScene`.
- Modify `src/ui/GameOverlay.tsx`: render a compact `Sound on/off` button in the footer controls.
- Modify `src/ui/GameOverlay.test.tsx`: assert toggle label and click callback wiring.
- Modify `src/styles.css`: style sound toggle and fix compact/mobile layout issues found during QA.
- Modify `README.md`: document single-player, multiplayer server, env vars, and no-deployment status.
- Modify `docs/handoff.md`: record QA results, build warning status, and next steps.
- Create `docs/retrospectives/2026-06-16-web-open-readiness.md`: feature retrospective.

## Task 1: Sound Preference Storage

**Files:**
- Create: `src/game/storage/soundPreference.ts`
- Create: `src/game/storage/soundPreference.test.ts`

- [ ] **Step 1: Write the failing storage tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSoundEnabled, writeSoundEnabled } from "./soundPreference";

describe("sound preference storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults sound to enabled", () => {
    expect(readSoundEnabled()).toBe(true);
  });

  it("persists disabled and enabled states", () => {
    writeSoundEnabled(false);
    expect(readSoundEnabled()).toBe(false);

    writeSoundEnabled(true);
    expect(readSoundEnabled()).toBe(true);
  });

  it("keeps gameplay enabled when storage reads fail", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readSoundEnabled()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/storage/soundPreference.test.ts`

Expected: FAIL because `./soundPreference` does not exist.

- [ ] **Step 3: Implement storage helper**

```ts
const storageKey = "poop-dodge-3d:sound-enabled";

export function readSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // Gameplay should continue even if browser storage is unavailable.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/storage/soundPreference.test.ts`

Expected: PASS.

## Task 2: Audio Gate

**Files:**
- Modify: `src/game/audio.ts`
- Modify: `src/game/audio.test.ts`

- [ ] **Step 1: Write failing audio gate tests**

Add to `src/game/audio.test.ts`:

```ts
import { afterEach, vi } from "vitest";
import { playGameSound, setGameSoundEnabled } from "./audio";

afterEach(() => {
  setGameSoundEnabled(true);
  vi.restoreAllMocks();
});

it("does not create an audio context while sound is disabled", () => {
  const audioContextSpy = vi.fn();
  vi.stubGlobal("AudioContext", audioContextSpy);

  setGameSoundEnabled(false);
  playGameSound("roundStart");

  expect(audioContextSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/game/audio.test.ts`

Expected: FAIL because `setGameSoundEnabled` is not exported.

- [ ] **Step 3: Implement audio enabled gate**

Add module state and guard:

```ts
let soundEnabled = true;

export function setGameSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function primeGameAudio(): void {
  if (!soundEnabled) {
    return;
  }
  const context = getAudioContext();
  void context?.resume();
}

export function playGameSound(event: GameSoundEvent): void {
  if (!soundEnabled) {
    return;
  }
  // existing implementation continues here
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/game/audio.test.ts`

Expected: PASS.

## Task 3: Sound Toggle UI Wiring

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/ui/GameOverlay.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing overlay tests**

Update `GameOverlay` test render calls with:

```tsx
soundEnabled
onToggleSound={() => undefined}
```

Add tests:

```tsx
it("shows sound enabled state in the footer controls", () => {
  const html = renderToStaticMarkup(
    <GameOverlay
      mode="single"
      phase="ready"
      stats={stats}
      touchActive={false}
      multiplayer={createMultiplayer(createRoom("lobby"))}
      survivorListCollapsed={false}
      soundEnabled
      onToggleSound={() => undefined}
      onToggleSurvivorList={() => undefined}
      onStartSingle={() => undefined}
      onSelectMultiplayer={() => undefined}
      onBackToSingle={noop}
      onLeaveMultiplayerRoom={noop}
    />
  );

  expect(html).toContain("Sound on");
});

it("shows sound disabled state in the footer controls", () => {
  const html = renderToStaticMarkup(
    <GameOverlay
      mode="single"
      phase="ready"
      stats={stats}
      touchActive={false}
      multiplayer={createMultiplayer(createRoom("lobby"))}
      survivorListCollapsed={false}
      soundEnabled={false}
      onToggleSound={() => undefined}
      onToggleSurvivorList={() => undefined}
      onStartSingle={() => undefined}
      onSelectMultiplayer={() => undefined}
      onBackToSingle={noop}
      onLeaveMultiplayerRoom={noop}
    />
  );

  expect(html).toContain("Sound off");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/ui/GameOverlay.test.tsx`

Expected: FAIL because `GameOverlayProps` does not include `soundEnabled` and `onToggleSound`, and markup does not include sound labels.

- [ ] **Step 3: Implement overlay props and button**

Add props:

```ts
soundEnabled: boolean;
onToggleSound: () => void;
```

In footer:

```tsx
<button
  className={soundEnabled ? "sound-toggle is-on" : "sound-toggle"}
  type="button"
  onClick={onToggleSound}
  aria-pressed={soundEnabled}
>
  {soundEnabled ? "Sound on" : "Sound off"}
</button>
```

- [ ] **Step 4: Wire app state**

In `App.tsx` import:

```ts
import { readSoundEnabled, writeSoundEnabled } from "../game/storage/soundPreference";
import { playGameSound, primeGameAudio, setGameSoundEnabled } from "../game/audio";
```

Add state:

```ts
const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
```

Add effect:

```ts
useEffect(() => {
  setGameSoundEnabled(soundEnabled);
  writeSoundEnabled(soundEnabled);
}, [soundEnabled]);
```

Add callback:

```ts
const toggleSound = useCallback(() => {
  setSoundEnabled((current) => !current);
}, []);
```

Pass to `GameOverlay`:

```tsx
soundEnabled={soundEnabled}
onToggleSound={toggleSound}
```

- [ ] **Step 5: Style the toggle**

Add compact CSS:

```css
.sound-toggle {
  min-height: 30px;
  padding: 5px 8px;
  border: 3px solid #1f2937;
  border-radius: 8px;
  background: #fffdf4;
  box-shadow: 3px 3px 0 #d6d3d1;
  color: #1f2937;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.sound-toggle.is-on {
  background: #bbf7d0;
}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- src/game/storage/soundPreference.test.ts src/game/audio.test.ts src/ui/GameOverlay.test.tsx`

Expected: PASS.

## Task 4: Layout And Reduced Motion Pass

**Files:**
- Modify: `src/styles.css`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Inspect current browser state**

Run the local app:

```bash
VITE_MULTIPLAYER_SERVER_URL=http://localhost:5174 npm run dev -- --host localhost --port 5173
```

Use browser QA at:

- `1280x720`
- `390x844`
- `667x375`

Check these visible elements:

- `scorebar`
- `status-strip`
- `wave-banner`
- `doodle-callout`
- `survivor-list`
- `run-highlight`
- `Retry`
- `Sound on/off`

- [ ] **Step 2: Apply CSS fixes only where QA shows crowding**

Use targeted CSS, for example:

```css
@media (max-height: 560px) {
  .wave-banner {
    margin-top: 30px;
    padding: 6px 9px;
  }

  .run-highlight {
    display: none;
  }
}
```

Do not hide critical buttons or scores.

- [ ] **Step 3: Strengthen reduced motion**

Extend existing reduced motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .status-chip.is-fever,
  .wave-banner,
  .doodle-callout {
    animation: none;
  }
}
```

- [ ] **Step 4: Browser verify**

Expected:

- Desktop ready/play/game-over/retry has no visible overlap.
- Mobile portrait keeps retry and sound toggle visible.
- Mobile landscape keeps result buttons visible.
- Browser console has no runtime errors.

## Task 5: Build Warning Analysis And Optional Scene Lazy Loading

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `docs/handoff.md`

- [ ] **Step 1: Run baseline build**

Run: `npm run build`

Expected: Build exits 0. Record JS gzip size and chunk warning.

- [ ] **Step 2: Try `GameScene` lazy loading**

Change import:

```ts
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

const GameScene = lazy(() =>
  import("../game/GameScene").then((module) => ({ default: module.GameScene }))
);
```

Keep existing `<Suspense fallback={null}>`.

- [ ] **Step 3: Run app and build checks**

Run:

```bash
npm run test -- src/app/App.test.ts src/ui/GameOverlay.test.tsx
npm run build
```

Expected:

- Tests pass.
- Build exits 0.
- If chunk warning is reduced or removed and local app still loads cleanly, keep lazy loading.
- If initial render/test behavior becomes flaky, revert the lazy-loading change and document the warning.

## Task 6: Documentation And Retrospective

**Files:**
- Modify: `README.md`
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-16-web-open-readiness.md`

- [ ] **Step 1: Update README**

Include:

Add this section to `README.md`:

````md
## Multiplayer Local Run

Terminal 1:

```bash
npm run server:start
```

Terminal 2:

```bash
VITE_MULTIPLAYER_SERVER_URL=http://localhost:5174 npm run dev -- --host localhost --port 5173
```

No public deployment is planned until explicitly approved.
````

- [ ] **Step 2: Update handoff**

Record:

- Sound preference feature
- QA viewports checked
- Build warning status
- Any known browser limitations

- [ ] **Step 3: Add retrospective**

Use:

```md
# Web Open Readiness Retrospective

## Summary

Prepared the local web MVP for web-open review with sound settings, layout QA, build-warning analysis, and documentation updates.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`
- Browser QA at desktop, mobile portrait, and mobile landscape
```

## Task 7: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full checks**

Run:

```bash
npm run lint
npm run test
npm run build
npm run server:check
```

Expected: All commands exit 0. Build may still show Vite large chunk warning only if documented.

- [ ] **Step 2: Check git state**

Run: `git status --short`

Expected: only intended readiness-pass files are modified or added.

- [ ] **Step 3: Stop before commit unless requested**

Do not commit or push unless the user explicitly asks in the current turn.

## Self-Review

- Spec coverage: Covers browser QA, mobile layout, sound toggle, reduced motion, build warning, README, handoff, and retrospective.
- Placeholder scan: No placeholder sections; every task includes file paths, commands, expected outcomes, and code examples.
- Type consistency: Uses `soundEnabled`, `onToggleSound`, `readSoundEnabled`, `writeSoundEnabled`, and `setGameSoundEnabled` consistently across tasks.
