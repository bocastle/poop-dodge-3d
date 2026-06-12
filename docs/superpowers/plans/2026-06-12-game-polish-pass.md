# Game Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise `poop-dodge-3d` from a technically playable MVP to a browser-first arcade prototype with clearer visual identity, stronger movement feel, readable danger cues, and better start/game-over presentation.

**Architecture:** Keep the current React Three Fiber game loop, but split polish work into small, testable layers: pure tuning helpers, scene presentation helpers, UI overlay polish, and verification/docs. Avoid server work, deployment, app packaging, login, ads, analytics, and heavy external assets.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Vitest, ESLint.

---

## Current Baseline

- Integration branch: `develop`
- Latest verified commit: `225ce8b 모바일 레이아웃 안정화 병합`
- Existing gameplay loop: start, play, score, dodge count, collision, game over, restart
- Existing controls: desktop keyboard and mobile drag
- Existing known gap: the game works, but visual density, feedback, and game feel are still prototype-level

## File Structure

- Create: `src/game/tuning.ts`
  - Owns gameplay and visual tuning constants so polish values are easy to adjust without hunting through the render loop.
- Create: `src/game/feedback.ts`
  - Pure helper functions for player lean, obstacle warning opacity/scale, camera shake intensity, and score milestone detection.
- Create: `src/game/feedback.test.ts`
  - Unit tests for the pure feedback helpers.
- Modify: `src/game/logic.ts`
  - Replace hardcoded player/arena/difficulty values with tuning constants.
- Modify: `src/game/logic.test.ts`
  - Update assertions to match the extracted tuning constants.
- Modify: `src/game/GameScene.tsx`
  - Add obstacle warning shadows, player squash/lean, camera shake, richer arena props, and hit/dodge feedback hooks.
- Modify: `src/ui/GameOverlay.tsx`
  - Add stronger ready/game-over copy, final score display, and state-aware classes.
- Modify: `src/app/App.tsx`
  - Pass phase metadata to the shell and overlay, and support lightweight feedback events if needed.
- Modify: `src/styles.css`
  - Polish HUD, start panel, game-over panel, controls, and responsive layout without landing-page styling.
- Modify: `docs/handoff.md`
  - Record the current polish status, commands, risks, and next handoff notes.
- Create: `docs/retrospectives/2026-06-12-game-polish-pass.md`
  - Record what changed, what was verified, and remaining risks after the feature is complete.

---

### Task 1: Branch Setup And Baseline Check

**Files:**
- Read: `AGENTS.md`
- Read: `docs/handoff.md`
- No source edits in this task

- [ ] **Step 1: Confirm clean integration branch**

Run:

```bash
git checkout develop
git status --short --branch
```

Expected:

```text
## develop...origin/develop
```

- [ ] **Step 2: Create the feature branch**

Run:

```bash
git checkout -b feature/game-polish-pass
```

Expected:

```text
Switched to a new branch 'feature/game-polish-pass'
```

- [ ] **Step 3: Run baseline checks**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

```text
eslint exits 0
Vitest reports 7 passing tests
Vite build exits 0
```

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

---

### Task 2: Extract Tuning Constants

**Files:**
- Create: `src/game/tuning.ts`
- Modify: `src/game/logic.ts`
- Modify: `src/game/logic.test.ts`

- [ ] **Step 1: Write the failing tests for tuning-backed logic**

Modify `src/game/logic.test.ts` so the imports include `GAME_TUNING`:

```ts
import { GAME_TUNING } from "./tuning";
```

Add these tests inside `describe("game logic", () => { ... })`:

```ts
it("uses shared tuning for arena movement", () => {
  const next = movePlayer(
    { x: GAME_TUNING.arena.width / 2 - 0.05, y: 0.42, z: 0 },
    { x: 1, z: 0 },
    1,
    GAME_TUNING.player.speed,
    GAME_TUNING.arena
  );

  expect(next.x).toBe(GAME_TUNING.arena.width / 2);
});

it("keeps difficulty within tuned limits", () => {
  const start = getDifficulty(0);
  const late = getDifficulty(90);

  expect(start.fallSpeed).toBe(GAME_TUNING.difficulty.startFallSpeed);
  expect(late.fallSpeed).toBe(GAME_TUNING.difficulty.maxFallSpeed);
  expect(late.spawnInterval).toBe(GAME_TUNING.difficulty.minSpawnInterval);
  expect(late.maxObstacles).toBe(GAME_TUNING.difficulty.maxObstacles);
});
```

- [ ] **Step 2: Run tests to verify the new import fails**

Run:

```bash
npm run test
```

Expected:

```text
Cannot find module './tuning'
```

- [ ] **Step 3: Create the tuning constants**

Create `src/game/tuning.ts`:

```ts
export const GAME_TUNING = {
  player: {
    speed: 6.15,
    radius: 0.5,
    startY: 0.42,
  },
  arena: {
    width: 7.6,
    depth: 7.6,
  },
  difficulty: {
    rampSeconds: 55,
    startFallSpeed: 3.25,
    maxFallSpeed: 5.65,
    startSpawnInterval: 0.76,
    minSpawnInterval: 0.42,
    startMaxObstacles: 14,
    maxObstacles: 28,
  },
  score: {
    pointsPerSecond: 12,
    pointsPerDodge: 35,
  },
  visuals: {
    maxRenderedObstacles: 36,
    warningStartY: 5.8,
    warningFullY: 1.1,
    cameraShakeSeconds: 0.22,
  },
} as const;
```

- [ ] **Step 4: Wire tuning into logic**

Modify the top of `src/game/logic.ts`:

```ts
import type { ArenaBounds, Difficulty, InputVector, Obstacle, Position } from "./types";
import { GAME_TUNING } from "./tuning";

export const PLAYER_SPEED = GAME_TUNING.player.speed;
export const PLAYER_RADIUS = GAME_TUNING.player.radius;
export const ARENA_BOUNDS: ArenaBounds = GAME_TUNING.arena;
```

Replace `getDifficulty` with:

```ts
export function getDifficulty(elapsedSeconds: number): Difficulty {
  const level = Math.min(elapsedSeconds / GAME_TUNING.difficulty.rampSeconds, 1);
  return {
    fallSpeed:
      GAME_TUNING.difficulty.startFallSpeed +
      level *
        (GAME_TUNING.difficulty.maxFallSpeed - GAME_TUNING.difficulty.startFallSpeed),
    spawnInterval:
      GAME_TUNING.difficulty.startSpawnInterval -
      level *
        (GAME_TUNING.difficulty.startSpawnInterval -
          GAME_TUNING.difficulty.minSpawnInterval),
    maxObstacles: Math.round(
      GAME_TUNING.difficulty.startMaxObstacles +
        level *
          (GAME_TUNING.difficulty.maxObstacles - GAME_TUNING.difficulty.startMaxObstacles)
    ),
  };
}
```

Replace `getScore` with:

```ts
export function getScore(elapsedSeconds: number, dodged: number) {
  return Math.floor(
    elapsedSeconds * GAME_TUNING.score.pointsPerSecond +
      dodged * GAME_TUNING.score.pointsPerDodge
  );
}
```

Replace the obstacle spawn `y` value in `createObstacle` with:

```ts
y: 7.6 + difficulty.fallSpeed * 0.12,
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- src/game/logic.test.ts
```

Expected:

```text
PASS src/game/logic.test.ts
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/game/tuning.ts src/game/logic.ts src/game/logic.test.ts
git commit -m "게임 튜닝 상수 분리"
```

---

### Task 3: Add Pure Feedback Helpers

**Files:**
- Create: `src/game/feedback.ts`
- Create: `src/game/feedback.test.ts`

- [ ] **Step 1: Write feedback helper tests**

Create `src/game/feedback.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getCameraShake,
  getPlayerLean,
  getWarningOpacity,
  getWarningScale,
  isScoreMilestone,
} from "./feedback";

describe("game feedback helpers", () => {
  it("leans the player based on normalized input", () => {
    expect(getPlayerLean({ x: 1, z: -1 })).toEqual({
      rotationX: -0.16,
      rotationY: -0.42,
      scaleY: 1.04,
    });
  });

  it("increases warning opacity as an obstacle approaches the floor", () => {
    expect(getWarningOpacity(5.8)).toBeCloseTo(0);
    expect(getWarningOpacity(1.1)).toBeCloseTo(0.62);
  });

  it("expands warning scale as an obstacle gets dangerous", () => {
    expect(getWarningScale(5.8, 0.4)).toBeCloseTo(0.48);
    expect(getWarningScale(1.1, 0.4)).toBeCloseTo(0.88);
  });

  it("fades camera shake over its duration", () => {
    expect(getCameraShake(0)).toBe(0);
    expect(getCameraShake(0.11)).toBeGreaterThan(0);
    expect(getCameraShake(0.3)).toBe(0);
  });

  it("detects score milestones once per 250 points", () => {
    expect(isScoreMilestone(249, 251)).toBe(true);
    expect(isScoreMilestone(251, 260)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the feedback tests to verify they fail**

Run:

```bash
npm run test -- src/game/feedback.test.ts
```

Expected:

```text
Cannot find module './feedback'
```

- [ ] **Step 3: Implement feedback helpers**

Create `src/game/feedback.ts`:

```ts
import type { InputVector } from "./types";
import { GAME_TUNING } from "./tuning";

export function getPlayerLean(input: InputVector) {
  return {
    rotationX: round(input.z * 0.16),
    rotationY: round(input.x * -0.42),
    scaleY: input.x !== 0 || input.z !== 0 ? 1.04 : 1,
  };
}

export function getWarningOpacity(obstacleY: number) {
  const progress = getWarningProgress(obstacleY);
  return round(progress * 0.62);
}

export function getWarningScale(obstacleY: number, obstacleRadius: number) {
  const progress = getWarningProgress(obstacleY);
  return round(obstacleRadius * (1.2 + progress));
}

export function getCameraShake(secondsSinceImpact: number) {
  if (secondsSinceImpact <= 0 || secondsSinceImpact >= GAME_TUNING.visuals.cameraShakeSeconds) {
    return 0;
  }

  const remaining = 1 - secondsSinceImpact / GAME_TUNING.visuals.cameraShakeSeconds;
  return round(remaining * 0.12);
}

export function isScoreMilestone(previousScore: number, nextScore: number) {
  return Math.floor(previousScore / 250) !== Math.floor(nextScore / 250);
}

function getWarningProgress(obstacleY: number) {
  const range = GAME_TUNING.visuals.warningStartY - GAME_TUNING.visuals.warningFullY;
  const raw = (GAME_TUNING.visuals.warningStartY - obstacleY) / range;
  return Math.min(1, Math.max(0, raw));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
```

- [ ] **Step 4: Run feedback tests**

Run:

```bash
npm run test -- src/game/feedback.test.ts
```

Expected:

```text
PASS src/game/feedback.test.ts
```

- [ ] **Step 5: Run all tests**

Run:

```bash
npm run test
```

Expected:

```text
2 test files pass
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/game/feedback.ts src/game/feedback.test.ts
git commit -m "게임 피드백 헬퍼 추가"
```

---

### Task 4: Add Scene Polish And Danger Cues

**Files:**
- Modify: `src/game/GameScene.tsx`
- Modify: `src/game/tuning.ts`
- Modify: `src/game/feedback.ts`
- Modify: `src/game/feedback.test.ts`

- [ ] **Step 1: Add a test for warning visibility below the floor**

Append to `src/game/feedback.test.ts`:

```ts
it("hides warning cues after an obstacle has passed the player", () => {
  expect(getWarningOpacity(-1.3)).toBe(0);
  expect(getWarningScale(-1.3, 0.4)).toBe(0);
});
```

- [ ] **Step 2: Run feedback tests to verify the new case fails**

Run:

```bash
npm run test -- src/game/feedback.test.ts
```

Expected:

```text
FAIL because passed obstacles still return warning opacity or scale
```

- [ ] **Step 3: Update warning helpers for passed obstacles**

Modify `src/game/feedback.ts`:

```ts
export function getWarningOpacity(obstacleY: number) {
  if (obstacleY < -1.2) {
    return 0;
  }

  const progress = getWarningProgress(obstacleY);
  return round(progress * 0.62);
}

export function getWarningScale(obstacleY: number, obstacleRadius: number) {
  if (obstacleY < -1.2) {
    return 0;
  }

  const progress = getWarningProgress(obstacleY);
  return round(obstacleRadius * (1.2 + progress));
}
```

- [ ] **Step 4: Add warning instancing and player feel to `GameScene`**

Modify imports in `src/game/GameScene.tsx`:

```ts
import { Color, Object3D } from "three";
import { getCameraShake, getPlayerLean, getWarningOpacity, getWarningScale } from "./feedback";
import { GAME_TUNING } from "./tuning";
```

Add refs near existing refs:

```ts
const warningMeshRef = useRef<InstancedMesh>(null);
const impactTimer = useRef(0);
const lastCameraOffset = useRef({ x: 0, y: 0 });
```

Replace `maxRenderedObstacles` with:

```ts
const maxRenderedObstacles = GAME_TUNING.visuals.maxRenderedObstacles;
```

After player movement, apply lean:

```ts
const lean = getPlayerLean(input);
player.rotation.y = lean.rotationY;
player.rotation.x = lean.rotationX;
player.scale.set(1, lean.scaleY, 1);
```

Before returning from hit:

```ts
impactTimer.current = GAME_TUNING.visuals.cameraShakeSeconds;
```

In every playing frame, update camera shake:

```ts
impactTimer.current = Math.max(0, impactTimer.current - dt);
const shake = getCameraShake(GAME_TUNING.visuals.cameraShakeSeconds - impactTimer.current);
lastCameraOffset.current = {
  x: Math.sin(state.clock.elapsedTime * 82) * shake,
  y: Math.cos(state.clock.elapsedTime * 71) * shake,
};
state.camera.position.x = lastCameraOffset.current.x;
state.camera.position.y = 8.5 + lastCameraOffset.current.y;
state.camera.lookAt(0, 0, 0);
```

Call warning mesh sync after obstacle sync:

```ts
syncWarningMesh(warningMeshRef.current, matrixObject, obstacles.current);
```

Add the warning instanced mesh to JSX before the obstacle mesh:

```tsx
<instancedMesh ref={warningMeshRef} args={[undefined, undefined, maxRenderedObstacles]}>
  <circleGeometry args={[1, 36]} />
  <meshBasicMaterial color="#ff6b6b" transparent opacity={0.48} depthWrite={false} />
</instancedMesh>
```

Add this helper below `syncObstacleMesh`:

```ts
function syncWarningMesh(
  mesh: InstancedMesh | null,
  matrixObject: Object3D,
  obstacles: Obstacle[]
) {
  if (!mesh) {
    return;
  }

  let visibleCount = 0;
  obstacles.forEach((obstacle) => {
    const scale = getWarningScale(obstacle.y, obstacle.radius);
    const opacity = getWarningOpacity(obstacle.y);

    if (scale <= 0 || opacity <= 0) {
      return;
    }

    matrixObject.position.set(obstacle.x, 0.012, obstacle.z);
    matrixObject.rotation.set(-Math.PI / 2, 0, 0);
    matrixObject.scale.setScalar(scale);
    matrixObject.updateMatrix();
    mesh.setMatrixAt(visibleCount, matrixObject.matrix);
    visibleCount += 1;
  });

  mesh.count = visibleCount;
  mesh.instanceMatrix.needsUpdate = true;
}
```

- [ ] **Step 5: Add arena depth without external assets**

In `GameScene.tsx`, add four low walls around the arena:

```tsx
<mesh position={[0, 0.18, -ARENA_BOUNDS.depth / 2 - 0.12]}>
  <boxGeometry args={[ARENA_BOUNDS.width + 0.5, 0.28, 0.12]} />
  <meshStandardMaterial color="#243544" roughness={0.88} />
</mesh>
<mesh position={[0, 0.18, ARENA_BOUNDS.depth / 2 + 0.12]}>
  <boxGeometry args={[ARENA_BOUNDS.width + 0.5, 0.28, 0.12]} />
  <meshStandardMaterial color="#243544" roughness={0.88} />
</mesh>
<mesh position={[-ARENA_BOUNDS.width / 2 - 0.12, 0.18, 0]}>
  <boxGeometry args={[0.12, 0.28, ARENA_BOUNDS.depth + 0.5]} />
  <meshStandardMaterial color="#243544" roughness={0.88} />
</mesh>
<mesh position={[ARENA_BOUNDS.width / 2 + 0.12, 0.18, 0]}>
  <boxGeometry args={[0.12, 0.28, ARENA_BOUNDS.depth + 0.5]} />
  <meshStandardMaterial color="#243544" roughness={0.88} />
</mesh>
```

- [ ] **Step 6: Remove unused imports**

If `Color` is not used after implementation, remove it from the `three` import.

- [ ] **Step 7: Verify tests and build**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

```text
eslint exits 0
Vitest reports all tests passing
Vite build exits 0
```

- [ ] **Step 8: Commit**

Run:

```bash
git add src/game/GameScene.tsx src/game/tuning.ts src/game/feedback.ts src/game/feedback.test.ts
git commit -m "위험 표시와 장면 연출 개선"
```

---

### Task 5: Polish Overlay And Game State Presentation

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add phase data to the shell**

Modify the root element in `src/app/App.tsx`:

```tsx
<main className="game-shell" data-phase={phase} {...touchControls.handlers}>
```

- [ ] **Step 2: Add final score presentation to the overlay**

Modify the panel section in `src/ui/GameOverlay.tsx`:

```tsx
<div className="panel" data-panel={phase}>
  <p className="eyebrow">{phase === "ready" ? "3D dodge arcade" : "run ended"}</p>
  <h1>{phase === "ready" ? "Poop Dodge 3D" : "Game Over"}</h1>
  {phase === "game-over" && (
    <div className="final-score">
      <span>Final score</span>
      <strong>{stats.score.toLocaleString()}</strong>
    </div>
  )}
  <p className="summary">
    {phase === "ready"
      ? "Dash through the danger zone, read the shadows, and survive the drop."
      : `You dodged ${stats.dodged.toLocaleString()} drops in ${Math.floor(
          stats.elapsedSeconds
        )} seconds.`}
  </p>
  <button type="button" onClick={onStart}>
    {phase === "ready" ? "Start" : "Restart"}
  </button>
</div>
```

- [ ] **Step 3: Add state-aware CSS**

Append to the panel section in `src/styles.css`:

```css
.game-shell[data-phase="playing"] .scorebar div {
  border-color: rgba(123, 223, 242, 0.22);
}

.panel[data-panel="game-over"] {
  border-color: rgba(255, 107, 107, 0.38);
}

.final-score {
  display: grid;
  gap: 4px;
  margin: 18px auto 0;
  padding: 12px;
  border: 1px solid rgba(255, 230, 109, 0.28);
  border-radius: 8px;
  background: rgba(255, 230, 109, 0.08);
}

.final-score span {
  color: #9fb3c8;
  font-size: 11px;
  line-height: 1.2;
  text-transform: uppercase;
}

.final-score strong {
  color: #ffe66d;
  font-size: 30px;
  line-height: 1;
}
```

- [ ] **Step 4: Verify CSS remains responsive**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
eslint exits 0
Vite build exits 0
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/app/App.tsx src/ui/GameOverlay.tsx src/styles.css
git commit -m "게임 오버 화면 표현 개선"
```

---

### Task 6: Browser Verification Pass

**Files:**
- No source edits unless verification exposes layout or runtime issues

- [ ] **Step 1: Run preview**

Run:

```bash
npm run preview
```

Expected:

```text
Local: http://127.0.0.1:4173/
```

- [ ] **Step 2: Verify desktop viewport**

Open:

```text
http://127.0.0.1:4173/
```

Desktop checklist:

```text
Canvas fills viewport
Ready panel is centered and readable
Start button enters gameplay
Player moves with WASD and arrow keys
Falling obstacles are visible
Ground warning cues are visible before obstacles reach the player
Score increments while playing
Collision reaches game-over screen
Restart starts a fresh run
No horizontal overflow
No console runtime errors
```

- [ ] **Step 3: Verify mobile-sized viewport**

Use browser device size around:

```text
390 x 844
```

Mobile checklist:

```text
HUD fits within the viewport
Ready/game-over panel fits without clipping
Drag input moves the player
Controls text does not overlap other UI
Ground warning cues remain visible
No horizontal overflow
```

- [ ] **Step 4: Stop preview**

Stop the preview process with `Ctrl+C` or terminate only the preview PID.

- [ ] **Step 5: Fix verification issues before continuing**

If any checklist item fails, make the smallest targeted fix, then rerun:

```bash
npm run lint
npm run test
npm run build
```

- [ ] **Step 6: Commit fixes if any source changed**

Run only if source files changed during verification:

```bash
git add src docs
git commit -m "게임 폴리싱 검증 수정"
```

---

### Task 7: Documentation And Integration

**Files:**
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-12-game-polish-pass.md`

- [ ] **Step 1: Update handoff**

Add this to `docs/handoff.md` under `The MVP now includes` after responsive HUD:

```markdown
- Game polish pass with warning shadows, improved movement feel, stronger game-over presentation, and procedural arena depth
```

Add this to `docs/handoff.md` under `Next Steps`:

```markdown
5. Decide whether the next feature should focus on sound, asset/model replacement, or mobile real-device tuning.
```

Add this to `docs/handoff.md` under `Notes`:

```markdown
- The game still uses procedural primitives only. Replacing the player and obstacles with authored models is intentionally deferred.
```

- [ ] **Step 2: Create the retrospective**

Create `docs/retrospectives/2026-06-12-game-polish-pass.md`:

```markdown
# Game Polish Pass Retrospective

## What Changed

- Extracted gameplay tuning constants.
- Added pure feedback helpers for warning cues, lean, camera shake, and score milestones.
- Added ground warning cues for falling obstacles.
- Improved player movement feel and scene depth.
- Improved ready and game-over overlay presentation.

## What Went Well

- Pure helpers kept the polish behavior testable.
- Procedural visuals improved readability without adding heavy assets.
- The work stayed browser-first and avoided deployment scope.

## What Was Tricky

- Visual polish depends on browser verification because unit tests cannot prove the scene feels good.
- Camera shake and warning cues need restraint so they improve readability without distracting the player.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run preview`
- Desktop browser gameplay check
- Mobile-sized viewport layout check

## Follow-Up Work

- Add sound effects after user approval.
- Replace procedural models with lightweight authored or generated assets after visual direction is approved.
- Test touch controls on a real mobile device.
- Consider code splitting if the Three.js chunk warning becomes a release concern.
```

- [ ] **Step 3: Final verification**

Run:

```bash
npm run lint
npm run test
npm run build
git status --short --branch
```

Expected:

```text
eslint exits 0
Vitest reports all tests passing
Vite build exits 0
Only docs changes are unstaged, or working tree is clean after commit
```

- [ ] **Step 4: Commit docs**

Run:

```bash
git add docs/handoff.md docs/retrospectives/2026-06-12-game-polish-pass.md
git commit -m "게임 폴리싱 문서 정리"
```

- [ ] **Step 5: Merge only after user approval**

Ask the user before integration:

```text
feature/game-polish-pass 작업이 검증됐습니다. develop에 병합하고 푸시할까요?
```

Do not run merge or push until the user explicitly approves.

---

## Self-Review

- Spec coverage: The plan covers the user's quality concern by focusing on tuning, visual cues, player feel, overlay polish, browser verification, and documentation. It keeps deployment, server work, mobile app packaging, login, ads, and analytics out of scope.
- Placeholder scan: No unresolved placeholder markers or unspecified "write tests" steps remain. Tests, commands, expected results, and commit messages are explicit.
- Type consistency: New helpers use existing `InputVector`, `Obstacle`, and `GameStats` concepts. `GAME_TUNING` is introduced before tasks import it. `feedback.ts` functions are defined before scene tasks call them.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-06-12-game-polish-pass.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Ask the user which approach to use before writing implementation code.
