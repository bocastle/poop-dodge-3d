# Web Open Stability QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest web-open stability layer: a visible game loading fallback, clearer multiplayer connection failure copy, and a repeatable web-open QA checklist.

**Architecture:** Keep game runtime behavior unchanged. Add a pure UI loading component consumed by `App`, update the existing multiplayer hook error constants, and document the launch QA path in Markdown. Tests stay close to the changed behavior.

**Tech Stack:** Vite, React, TypeScript, React Three Fiber, Socket.IO client, Vitest, ESLint.

---

## File Structure

- Create `src/ui/LoadingFallback.tsx`: pure presentational loading fallback for lazy `GameScene`.
- Create `src/ui/LoadingFallback.test.tsx`: static markup tests for loading copy.
- Modify `src/app/App.tsx`: keep Canvas `Suspense` fallback as `null`, track `GameScene` module readiness, and render `LoadingFallback` as a DOM overlay outside Canvas.
- Modify `src/styles.css`: add `.scene-loading-layer`, `.loading-fallback`, and reduced-motion-safe animation handling.
- Modify `src/multiplayer/useMultiplayerRoom.ts`: update connection error copy.
- Modify `src/multiplayer/useMultiplayerRoom.test.ts`: test server-unavailable, connect-failed, and connection-lost copy.
- Create `docs/web-open-checklist.md`: repeatable pre-open QA checklist.
- Modify `docs/handoff.md`: record the stability QA pass and remaining risks.
- Create `docs/retrospectives/2026-06-16-web-open-stability-qa.md`: English retrospective.

## Task 1: Loading Fallback Component

**Files:**
- Create: `src/ui/LoadingFallback.test.tsx`
- Create: `src/ui/LoadingFallback.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Create `src/ui/LoadingFallback.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingFallback } from "./LoadingFallback";

describe("LoadingFallback", () => {
  it("renders web-open safe loading copy", () => {
    const html = renderToStaticMarkup(<LoadingFallback />);

    expect(html).toContain("Loading doodle arena");
    expect(html).toContain("Sketching the first round...");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test -- src/ui/LoadingFallback.test.tsx
```

Expected: fail because `./LoadingFallback` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/ui/LoadingFallback.tsx`:

```tsx
export function LoadingFallback() {
  return (
    <div className="loading-fallback" role="status" aria-live="polite">
      <strong>Loading doodle arena</strong>
      <span>Sketching the first round...</span>
    </div>
  );
}
```

- [ ] **Step 4: Verify GREEN for the component**

Run:

```bash
npm run test -- src/ui/LoadingFallback.test.tsx
```

Expected: pass.

- [ ] **Step 5: Wire fallback into App outside Canvas**

Modify `src/app/App.tsx`:

```tsx
import { LoadingFallback } from "../ui/LoadingFallback";
```

Define the module promise before the lazy component:

```tsx
const gameSceneModulePromise = import("../game/GameScene");
const GameScene = lazy(() =>
  gameSceneModulePromise.then((module) => ({ default: module.GameScene }))
);
```

Track readiness inside `App`:

```tsx
const [gameSceneReady, setGameSceneReady] = useState(false);

useEffect(() => {
  let cancelled = false;

  void gameSceneModulePromise.then(() => {
    if (!cancelled) {
      setGameSceneReady(true);
    }
  });

  return () => {
    cancelled = true;
  };
}, []);
```

Keep Canvas `Suspense` fallback as `null`, because React Three Fiber cannot render DOM nodes inside the Canvas renderer:

```tsx
<Suspense fallback={null}>
```

Render the DOM fallback as a sibling after `Canvas`:

```tsx
{!gameSceneReady ? (
  <div className="scene-loading-layer">
    <LoadingFallback />
  </div>
) : (
  <GameOverlay
    mode={mode}
    phase={phase}
    stats={stats}
    touchActive={touchControls.active}
    multiplayer={multiplayer}
    survivorListCollapsed={!survivorListOpen}
    soundEnabled={soundEnabled}
    onToggleSound={toggleSound}
    onToggleSurvivorList={toggleSurvivorList}
    onStartSingle={startGame}
    onSelectMultiplayer={selectMultiplayer}
    onBackToSingle={backToSingle}
    onLeaveMultiplayerRoom={leaveMultiplayerRoom}
  />
)}
```

- [ ] **Step 6: Style the loading fallback**

Add near the panel/callout styles in `src/styles.css`:

```css
.scene-loading-layer {
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right))
    max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
}

.loading-fallback {
  align-self: center;
  justify-self: center;
  display: grid;
  gap: 5px;
  width: min(320px, calc(100vw - 24px));
  padding: 14px 16px;
  border: 3px solid #1f2937;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 5px 5px 0 #d6d3d1;
  color: #1f2937;
  text-align: center;
  animation: wave-stamp 420ms ease-out both;
}

.loading-fallback strong {
  font-size: 16px;
  line-height: 1.1;
  text-transform: uppercase;
}

.loading-fallback span {
  color: rgba(31, 41, 55, 0.68);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
}
```

In the existing `@media (prefers-reduced-motion: reduce)` block, include `.loading-fallback` in the animation-disabled selector:

```css
.status-chip.is-hot,
.status-chip.is-fever,
.status-chip.is-shielded,
.wave-banner,
.doodle-callout,
.loading-fallback {
  animation: none;
}
```

- [ ] **Step 7: Verify App-related tests**

Run:

```bash
npm run test -- src/ui/LoadingFallback.test.tsx src/app/App.test.ts
```

Expected: both test files pass.

## Task 2: Multiplayer Connection Failure Copy

**Files:**
- Modify: `src/multiplayer/useMultiplayerRoom.test.ts`
- Modify: `src/multiplayer/useMultiplayerRoom.ts`

- [ ] **Step 1: Write failing tests for user-facing connection copy**

Append these tests inside `describe("useMultiplayerRoom", () => { ... })` in `src/multiplayer/useMultiplayerRoom.test.ts`:

```ts
  it("explains that single player works when the multiplayer server is not configured", () => {
    vi.mocked(getMultiplayerServerUrl).mockReturnValue(undefined);
    const hook = mountMultiplayerHook();

    act(() => {
      hook.getCurrent().createRoom();
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Multiplayer server is not configured. Single player is ready."
    );
    hook.unmount();
  });

  it("explains that single player works when multiplayer connection fails", () => {
    const { hook, socket } = setupHookWithSocket();

    act(() => {
      hook.getCurrent().createRoom();
      socket.trigger("connect_error");
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Could not reach the multiplayer server. Single player still works."
    );
    hook.unmount();
  });

  it("explains recovery options when an active room connection is lost", () => {
    const { hook, socket } = setupHookWithSocket();
    const room = createRoom([
      createPlayer("socket-local", "Ada"),
      createPlayer("socket-remote", "Lin"),
    ]);

    act(() => {
      hook.getCurrent().connect();
      socket.trigger("connect");
      socket.trigger("room:state", room);
      socket.trigger("disconnect");
    });

    expect(hook.getCurrent().state.error?.message).toBe(
      "Connection lost. Start a single run or try multiplayer again."
    );
    hook.unmount();
  });
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test -- src/multiplayer/useMultiplayerRoom.test.ts
```

Expected: the new message assertions fail because the old copy is still used.

- [ ] **Step 3: Update the hook error constants**

Modify `src/multiplayer/useMultiplayerRoom.ts`:

```ts
const serverUnavailableError: RoomErrorPayload = {
  code: "server_error",
  message: "Multiplayer server is not configured. Single player is ready.",
};

const connectionFailedError: RoomErrorPayload = {
  code: "server_error",
  message: "Could not reach the multiplayer server. Single player still works.",
};

const connectionLostError: RoomErrorPayload = {
  code: "server_error",
  message: "Connection lost. Start a single run or try multiplayer again.",
};
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/multiplayer/useMultiplayerRoom.test.ts
```

Expected: pass.

## Task 3: Web Open QA Checklist and Handoff

**Files:**
- Create: `docs/web-open-checklist.md`
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-16-web-open-stability-qa.md`

- [ ] **Step 1: Create the checklist document**

Create `docs/web-open-checklist.md`:

```markdown
# Web Open Checklist

## Scope

Use this checklist before opening the web MVP publicly. Deployment itself is out of scope until explicitly approved.

## Local Commands

- [ ] Install dependencies: `npm install`
- [ ] Start web app: `npm run dev`
- [ ] Start multiplayer server: `npm run server:start`
- [ ] Optional preview build: `npm run build` then `npm run preview`

## Environment

- [ ] `VITE_MULTIPLAYER_SERVER_URL` points to the multiplayer server when multiplayer is being tested.
- [ ] `PORT` is set for the multiplayer server when the default `5174` is not used.
- [ ] `CLIENT_ORIGIN` matches the web app origin for Socket.IO CORS.

## Browser QA

- [ ] Desktop Chrome: ready screen, single-player start, retry, sound toggle.
- [ ] Desktop Safari: ready screen, single-player start, retry, sound toggle.
- [ ] Mobile portrait `390x844`: no horizontal or vertical page overflow on ready and game-over screens.
- [ ] Mobile landscape `667x375`: controls and retry actions remain visible.
- [ ] Reduced motion enabled: UI animation is reduced and the game remains usable.

## Multiplayer QA

- [ ] Server not configured: multiplayer shows a clear message and single player still starts.
- [ ] Server stopped: multiplayer shows a clear message and single player still starts.
- [ ] Create room: host sees a 4-digit room code.
- [ ] Join room: guest can join with the 4-digit room code.
- [ ] Countdown: all active players see `3 -> 2 -> 1 -> START`.
- [ ] Max room size: the server rejects the 11th player.
- [ ] Leave room: user returns to the single/multiplayer choice screen.

## Release Blockers

- [ ] No console errors in the checked browser path.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run server:check` passes.

## Known Deferred Risks

- No login or durable identity.
- Multiplayer rooms are in memory and vanish on server restart.
- No reconnect grace or anti-cheat.
- Real-device mobile testing is still required before a wider public launch.
```

- [ ] **Step 2: Update handoff**

In `docs/handoff.md`, add notes that the Web Open Stability QA pass added loading fallback, clearer multiplayer failure copy, and `docs/web-open-checklist.md`.

- [ ] **Step 3: Add retrospective**

Create `docs/retrospectives/2026-06-16-web-open-stability-qa.md` with Summary, What Went Well, Tradeoffs, Verification, and Follow-Up sections in English.

## Task 4: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

```bash
npm run test -- src/ui/LoadingFallback.test.tsx src/multiplayer/useMultiplayerRoom.test.ts src/app/App.test.ts
```

Expected: pass.

- [ ] **Step 2: Run full verification**

```bash
npm run lint
npm run test
npm run build
npm run server:check
```

Expected: all pass.

- [ ] **Step 3: Inspect git status**

```bash
git status --short
```

Expected: only intended files are modified or added.

- [ ] **Step 4: Commit policy checkpoint**

Do not commit or push unless the user explicitly asks for commit/push in the current conversation.

## Self-Review

- Spec coverage: loading fallback is covered by Task 1, multiplayer error copy by Task 2, checklist/handoff/retrospective by Task 3, verification by Task 4.
- Placeholder scan: no unfinished marker or deferred implementation instruction is present.
- Type consistency: `LoadingFallback`, `UseMultiplayerRoomResult`, and existing error payload types match the current codebase.
