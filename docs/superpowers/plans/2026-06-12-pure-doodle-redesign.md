# Pure Doodle Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the current dark prototype scene into the approved C1 Pure Doodle direction: paper field, thick outlines, doodle mascot, poop icon hazards, red warning rings, and matching HUD.

**Architecture:** Keep gameplay state and collision in the existing `GameScene.tsx` loop, but extract visual rendering into small React Three Fiber components under `src/game/visuals/`. Keep numerical visual decisions in pure helpers so tests can protect movement feel, warning intensity, and visual state mapping.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Vitest, ESLint.

---

## Current Baseline

- Current branch at planning time: `feature/game-polish-pass`
- Latest pushed commit: `7e2439d 게임 폴리시 패스 적용`
- Current game state: playable web MVP with tuning constants, dark arena, yellow capsule player, dodecahedron hazards, translucent floor warnings, responsive HUD.
- Approved visual direction: `C1 Pure Doodle`
- Design spec: `docs/superpowers/specs/2026-06-12-pure-doodle-redesign-design.md`

## Execution Notes

- Documentation stays in English.
- Commit messages are Korean.
- The user previously required explicit approval before commit/push. The commit steps below are planned checkpoints; only execute them when the user explicitly says to commit/push during implementation.
- Do not add `.superpowers/` visual companion files to commits.
- Public deployment remains out of scope.

## File Structure

- Create: `src/game/visuals/doodleStyle.ts`
  - Pure helpers and constants for outline scale, paper colors, player motion state, hazard visual state, and warning ring state.
- Create: `src/game/visuals/doodleStyle.test.ts`
  - Unit tests for visual state helpers.
- Create: `src/game/visuals/DoodlePlayer.tsx`
  - Renders the mascot player from simple primitives and applies lean/squash/leg animation.
- Create: `src/game/visuals/DoodleHazard.tsx`
  - Renders a single poop hazard as stacked outlined primitives.
- Create: `src/game/visuals/PaperArena.tsx`
  - Renders the white paper field, grid lines, thick border, and shadow base.
- Create: `src/game/visuals/DangerRing.tsx`
  - Renders one dashed red landing ring.
- Modify: `src/game/GameScene.tsx`
  - Replace inline dark scene primitives with the new visual components while preserving gameplay logic.
- Modify: `src/game/tuning.ts`
  - Add visual tuning values for doodle outline scale, player bob, grouped hazard render cap, and warning ring style.
- Modify: `src/game/feedback.ts`
  - Update existing gameplay feedback helpers so player lean matches the approved doodle motion.
- Modify: `src/game/feedback.test.ts`
  - Update player lean tests for the stronger doodle motion.
- Modify: `src/styles.css`
  - Restyle HUD, buttons, panels, and controls into paper-label UI.
- Modify: `src/ui/GameOverlay.tsx`
  - Add an explicit `paper-action` class to the start/restart button for deterministic styling.
- Modify: `docs/handoff.md`
  - Record implementation status, verification commands, visual direction, and remaining risks.
- Create: `docs/retrospectives/2026-06-12-pure-doodle-redesign.md`
  - Record what changed, what was verified, and what should happen next.

---

### Task 1: Branch And Baseline Check

**Files:**
- Read: `docs/handoff.md`
- Read: `docs/superpowers/specs/2026-06-12-pure-doodle-redesign-design.md`
- No source edits in this task.

- [ ] **Step 1: Start from the latest integration branch**

Run:

```bash
git checkout develop
git pull --ff-only origin develop
git status --short --branch
```

Expected:

```text
## develop...origin/develop
```

- [ ] **Step 2: Create the feature branch**

Run:

```bash
git checkout -b feature/pure-doodle-redesign
```

Expected:

```text
Switched to a new branch 'feature/pure-doodle-redesign'
```

- [ ] **Step 3: Run baseline verification**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

```text
eslint exits 0
Vitest reports 15 passing tests
Vite build exits 0
```

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

---

### Task 2: Add Doodle Visual State Helpers

**Files:**
- Create: `src/game/visuals/doodleStyle.ts`
- Create: `src/game/visuals/doodleStyle.test.ts`
- Modify: `src/game/tuning.ts`

- [ ] **Step 1: Write failing tests for helper behavior**

Create `src/game/visuals/doodleStyle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getDoodleOutlineScale,
  getDoodlePlayerMotion,
  getDoodleWarningState,
  getHazardVisualState,
} from "./doodleStyle";

describe("doodle visual style helpers", () => {
  it("keeps outlines slightly larger than the visible mesh", () => {
    expect(getDoodleOutlineScale(1)).toBeCloseTo(1.08);
    expect(getDoodleOutlineScale(0.5)).toBeCloseTo(0.54);
  });

  it("adds visible lean and running state from input", () => {
    expect(getDoodlePlayerMotion({ x: 1, z: -1 }, 2)).toEqual({
      bobY: 0.036,
      legPhase: -1,
      rotationX: -0.2,
      rotationZ: -0.28,
      scaleY: 1.06,
      moving: true,
    });
  });

  it("keeps idle player motion subtle", () => {
    expect(getDoodlePlayerMotion({ x: 0, z: 0 }, 1)).toEqual({
      bobY: 0.014,
      legPhase: 0,
      rotationX: 0,
      rotationZ: 0,
      scaleY: 1,
      moving: false,
    });
  });

  it("maps hazard height to shadow and highlight strength", () => {
    expect(getHazardVisualState(5.8, 0.4)).toEqual({
      shadowOpacity: 0,
      shadowScale: 0.48,
      squash: 1,
    });

    expect(getHazardVisualState(1.1, 0.4)).toEqual({
      shadowOpacity: 0.34,
      shadowScale: 0.84,
      squash: 1.04,
    });
  });

  it("returns dashed red warning ring state near the floor", () => {
    expect(getDoodleWarningState(5.8, 0.4)).toEqual({
      opacity: 0,
      scale: 0.56,
      dashCount: 12,
    });

    expect(getDoodleWarningState(1.1, 0.4)).toEqual({
      opacity: 0.72,
      scale: 0.92,
      dashCount: 12,
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/game/visuals/doodleStyle.test.ts
```

Expected:

```text
Cannot find module './doodleStyle'
```

- [ ] **Step 3: Add doodle tuning values**

Modify `src/game/tuning.ts` so `visuals` includes these values:

```ts
visuals: {
  maxRenderedObstacles: 36,
  warningStartY: 5.8,
  warningFullY: 1.1,
  cameraShakeSeconds: 0.22,
  doodleOutlineScale: 1.08,
  doodleWarningDashCount: 12,
  doodlePlayerBob: 0.014,
  doodlePlayerRunBob: 0.036,
},
```

- [ ] **Step 4: Implement the pure helper module**

Create `src/game/visuals/doodleStyle.ts`:

```ts
import type { InputVector } from "../types";
import { GAME_TUNING } from "../tuning";

export type DoodlePlayerMotion = {
  bobY: number;
  legPhase: -1 | 0 | 1;
  moving: boolean;
  rotationX: number;
  rotationZ: number;
  scaleY: number;
};

export type HazardVisualState = {
  shadowOpacity: number;
  shadowScale: number;
  squash: number;
};

export type DoodleWarningState = {
  dashCount: number;
  opacity: number;
  scale: number;
};

export function getDoodleOutlineScale(baseScale: number) {
  return round(baseScale * GAME_TUNING.visuals.doodleOutlineScale);
}

export function getDoodlePlayerMotion(
  input: InputVector,
  elapsedSeconds: number
): DoodlePlayerMotion {
  const moving = input.x !== 0 || input.z !== 0;
  const legWave = Math.sin(elapsedSeconds * 16);
  return {
    bobY: round(moving ? GAME_TUNING.visuals.doodlePlayerRunBob : GAME_TUNING.visuals.doodlePlayerBob),
    legPhase: moving ? (legWave >= 0 ? 1 : -1) : 0,
    moving,
    rotationX: round(input.z * 0.2),
    rotationZ: round(input.x * -0.28),
    scaleY: moving ? 1.06 : 1,
  };
}

export function getHazardVisualState(
  obstacleY: number,
  obstacleRadius: number
): HazardVisualState {
  const progress = getWarningProgress(obstacleY);
  return {
    shadowOpacity: round(progress * 0.34),
    shadowScale: round(obstacleRadius * (1.2 + progress * 0.9)),
    squash: round(1 + progress * 0.04),
  };
}

export function getDoodleWarningState(
  obstacleY: number,
  obstacleRadius: number
): DoodleWarningState {
  const progress = getWarningProgress(obstacleY);
  return {
    dashCount: GAME_TUNING.visuals.doodleWarningDashCount,
    opacity: round(progress * 0.72),
    scale: round(obstacleRadius * (1.4 + progress * 0.9)),
  };
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

- [ ] **Step 5: Verify helper tests pass**

Run:

```bash
npm run test -- src/game/visuals/doodleStyle.test.ts
```

Expected:

```text
1 test file passed
5 tests passed
```

- [ ] **Step 6: Planned commit checkpoint**

Only run when the user explicitly authorizes commits:

```bash
git add src/game/tuning.ts src/game/visuals/doodleStyle.ts src/game/visuals/doodleStyle.test.ts
git commit -m "두들 비주얼 헬퍼 추가"
```

---

### Task 3: Build Doodle Render Components

**Files:**
- Create: `src/game/visuals/DoodlePlayer.tsx`
- Create: `src/game/visuals/DoodleHazard.tsx`
- Create: `src/game/visuals/PaperArena.tsx`
- Create: `src/game/visuals/DangerRing.tsx`

- [ ] **Step 1: Create the doodle player component**

Create `src/game/visuals/DoodlePlayer.tsx`:

```tsx
import type { Group } from "three";
import { useMemo } from "react";
import { Color } from "three";
import type { DoodlePlayerMotion } from "./doodleStyle";

type DoodlePlayerProps = {
  motion: DoodlePlayerMotion;
  position: [number, number, number];
};

const ink = "#1f2937";
const body = "#fef08a";
const paper = "#fffdf4";
const shadow = "#9ca3af";

export function DoodlePlayer({ motion, position }: DoodlePlayerProps) {
  const legOffset = motion.legPhase * 0.1;
  const bodyColor = useMemo(() => new Color(body), []);

  return (
    <group
      position={[position[0], position[1] + motion.bobY, position[2]]}
      rotation={[motion.rotationX, 0, motion.rotationZ]}
      scale={[1, motion.scaleY, 1]}
    >
      <mesh position={[0, -0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshBasicMaterial color={shadow} transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <mesh scale={[1.13, 1.13, 1.13]}>
        <sphereGeometry args={[0.38, 24, 18]} />
        <meshBasicMaterial color={ink} />
      </mesh>

      <mesh scale={[0.94, 1.06, 0.82]}>
        <sphereGeometry args={[0.38, 24, 18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.78} metalness={0} />
      </mesh>

      <mesh position={[0, 0.08, 0.31]} scale={[1.0, 0.36, 0.12]}>
        <sphereGeometry args={[0.24, 16, 10]} />
        <meshBasicMaterial color={paper} />
      </mesh>

      <mesh position={[-0.1, 0.09, 0.4]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0.1, 0.09, 0.4]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshBasicMaterial color={ink} />
      </mesh>

      <mesh position={[0, -0.1, 0.4]} scale={[1, 0.22, 0.12]}>
        <torusGeometry args={[0.11, 0.018, 8, 16, Math.PI]} />
        <meshBasicMaterial color={ink} />
      </mesh>

      <DoodleLeg x={-0.14} z={0.04 + legOffset} rotationZ={0.32 * motion.legPhase} />
      <DoodleLeg x={0.14} z={-0.04 - legOffset} rotationZ={-0.32 * motion.legPhase} />
    </group>
  );
}

function DoodleLeg({
  rotationZ,
  x,
  z,
}: {
  rotationZ: number;
  x: number;
  z: number;
}) {
  return (
    <group position={[x, -0.38, z]} rotation={[0, 0, rotationZ]}>
      <mesh scale={[0.06, 0.2, 0.06]}>
        <capsuleGeometry args={[0.5, 0.45, 4, 8]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Create the doodle hazard component**

Create `src/game/visuals/DoodleHazard.tsx`:

```tsx
import type { HazardVisualState } from "./doodleStyle";

type DoodleHazardProps = {
  position: [number, number, number];
  radius: number;
  rotation: number;
  visualState: HazardVisualState;
};

const ink = "#1f2937";
const brown = "#92400e";
const darkBrown = "#78350f";
const highlight = "#fbbf24";

export function DoodleHazard({
  position,
  radius,
  rotation,
  visualState,
}: DoodleHazardProps) {
  return (
    <group position={position} rotation={[rotation, rotation * 0.35, rotation * 0.22]}>
      <mesh
        position={[0, -position[1] + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[visualState.shadowScale, visualState.shadowScale * 0.42, 1]}
      >
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial
          color="#1f2937"
          transparent
          opacity={visualState.shadowOpacity}
          depthWrite={false}
        />
      </mesh>

      <group scale={[radius, radius * visualState.squash, radius]}>
        <PoopBlob y={-0.16} scale={[1.25, 0.48, 0.9]} color={darkBrown} />
        <PoopBlob y={0.1} scale={[0.94, 0.42, 0.76]} color={brown} />
        <PoopBlob y={0.34} scale={[0.56, 0.32, 0.5]} color={brown} />
        <mesh position={[0.16, 0.5, 0]} rotation={[0, 0, -0.58]} scale={[0.28, 0.16, 0.24]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color={ink} />
        </mesh>
        <mesh position={[0.15, 0.51, 0.02]} rotation={[0, 0, -0.58]} scale={[0.18, 0.1, 0.16]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={brown} roughness={0.86} metalness={0} />
        </mesh>
        <mesh position={[-0.25, 0.21, 0.58]} scale={[0.18, 0.05, 0.04]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={highlight} transparent opacity={0.58} />
        </mesh>
      </group>
    </group>
  );
}

function PoopBlob({
  color,
  scale,
  y,
}: {
  color: string;
  scale: [number, number, number];
  y: number;
}) {
  return (
    <>
      <mesh position={[0, y, 0]} scale={[scale[0] * 1.12, scale[1] * 1.16, scale[2] * 1.12]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, y + 0.01, 0.03]} scale={scale}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
      </mesh>
    </>
  );
}
```

- [ ] **Step 3: Create the paper arena component**

Create `src/game/visuals/PaperArena.tsx`:

```tsx
import type { ArenaBounds } from "../types";

type PaperArenaProps = {
  bounds: ArenaBounds;
};

const ink = "#1f2937";
const paper = "#fffdf4";
const grid = "#dbeafe";
const shadow = "#d6d3d1";

export function PaperArena({ bounds }: PaperArenaProps) {
  const width = bounds.width + 1.4;
  const depth = bounds.depth + 1.4;

  return (
    <group>
      <mesh position={[0.16, -0.08, 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={shadow} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[width, depth, 1, 1]} />
        <meshStandardMaterial color={paper} roughness={0.96} metalness={0} />
      </mesh>

      <GridLines width={width} depth={depth} />
      <Border width={width} depth={depth} />
    </group>
  );
}

function GridLines({ depth, width }: { depth: number; width: number }) {
  const lines = [];
  for (let x = -Math.floor(width / 2); x <= Math.floor(width / 2); x += 1) {
    lines.push(
      <mesh key={`x-${x}`} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.018, depth]} />
        <meshBasicMaterial color={grid} transparent opacity={0.55} />
      </mesh>
    );
  }
  for (let z = -Math.floor(depth / 2); z <= Math.floor(depth / 2); z += 1) {
    lines.push(
      <mesh key={`z-${z}`} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[0.018, width]} />
        <meshBasicMaterial color={grid} transparent opacity={0.55} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

function Border({ depth, width }: { depth: number; width: number }) {
  return (
    <group position={[0, 0.06, 0]}>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, depth]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, depth]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 4: Create the danger ring component**

Create `src/game/visuals/DangerRing.tsx`:

```tsx
import type { DoodleWarningState } from "./doodleStyle";

type DangerRingProps = {
  position: [number, number, number];
  state: DoodleWarningState;
};

export function DangerRing({ position, state }: DangerRingProps) {
  if (state.opacity <= 0) {
    return null;
  }

  const segments = Array.from({ length: state.dashCount }, (_, index) => index);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[state.scale, state.scale, 1]}>
      {segments.map((index) => {
        const angle = (index / state.dashCount) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle), Math.sin(angle), 0]} rotation={[0, 0, angle]}>
            <boxGeometry args={[0.34, 0.055, 0.015]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={state.opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 5: Run TypeScript through the build**

Run:

```bash
npm run build
```

Expected:

```text
tsc exits 0
vite build exits 0
```

- [ ] **Step 6: Planned commit checkpoint**

Only run when the user explicitly authorizes commits:

```bash
git add src/game/visuals/DoodlePlayer.tsx src/game/visuals/DoodleHazard.tsx src/game/visuals/PaperArena.tsx src/game/visuals/DangerRing.tsx
git commit -m "두들 렌더 컴포넌트 추가"
```

---

### Task 4: Integrate Pure Doodle Scene

**Files:**
- Modify: `src/game/GameScene.tsx`
- Modify: `src/game/feedback.ts`
- Modify: `src/game/feedback.test.ts`

- [ ] **Step 1: Update player lean tests for the stronger doodle feel**

Modify `src/game/feedback.test.ts`:

```ts
it("leans the player based on normalized input", () => {
  expect(getPlayerLean({ x: 1, z: -1 })).toEqual({
    rotationX: -0.2,
    rotationY: -0.42,
    scaleY: 1.06,
  });
});
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
npm run test -- src/game/feedback.test.ts
```

Expected:

```text
expected rotationX -0.16 to equal -0.2
```

- [ ] **Step 3: Update the feedback helper**

Modify `getPlayerLean` in `src/game/feedback.ts`:

```ts
export function getPlayerLean(input: InputVector) {
  const moving = input.x !== 0 || input.z !== 0;
  return {
    rotationX: round(input.z * 0.2),
    rotationY: round(input.x * -0.42),
    scaleY: moving ? 1.06 : 1,
  };
}
```

- [ ] **Step 4: Replace inline scene primitives with doodle components**

Modify imports in `src/game/GameScene.tsx`:

```ts
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { InstancedMesh } from "three";
import { Color, Object3D } from "three";
import { DangerRing } from "./visuals/DangerRing";
import { DoodleHazard } from "./visuals/DoodleHazard";
import { DoodlePlayer } from "./visuals/DoodlePlayer";
import { getDoodlePlayerMotion, getDoodleWarningState, getHazardVisualState } from "./visuals/doodleStyle";
import { PaperArena } from "./visuals/PaperArena";
```

Keep `obstacleMeshRef` only until the old instanced mesh is removed. Replace the player `Mesh` ref with a movement-only position ref:

```ts
const playerPosition = useRef<Position>(startPosition);
const playerRenderPosition = useRef<[number, number, number]>([
  startPosition.x,
  startPosition.y,
  startPosition.z,
]);
const playerMotion = getDoodlePlayerMotion(input, elapsed.current);
```

In the frame loop, replace direct `playerRef.current` mutations with:

```ts
playerRenderPosition.current = [
  playerPosition.current.x,
  playerPosition.current.y,
  playerPosition.current.z,
];
```

In the JSX, replace the old arena/player/instanced obstacle block with:

```tsx
<ambientLight intensity={1.35} color="#fff8dd" />
<directionalLight intensity={2.1} color="#ffffff" position={[4, 7, 3]} />
<directionalLight intensity={0.7} color="#dbeafe" position={[-5, 5, -4]} />

<PaperArena bounds={ARENA_BOUNDS} />

<DoodlePlayer
  position={playerRenderPosition.current}
  motion={getDoodlePlayerMotion(input, elapsed.current)}
/>

{obstacles.current.slice(-maxRenderedObstacles).map((obstacle) => (
  <DoodleHazard
    key={obstacle.id}
    position={[obstacle.x, obstacle.y, obstacle.z]}
    radius={obstacle.radius}
    rotation={obstacle.rotation}
    visualState={getHazardVisualState(obstacle.y, obstacle.radius)}
  />
))}

{obstacles.current.slice(-maxRenderedObstacles).map((obstacle) => (
  <DangerRing
    key={`warning-${obstacle.id}`}
    position={[obstacle.x, 0.035, obstacle.z]}
    state={getDoodleWarningState(obstacle.y, obstacle.radius)}
  />
))}
```

Remove the old dark plane, wall boxes, cyan ring, yellow capsule, `obstacleMeshRef` JSX, and `syncObstacleMesh` function.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm run test
npm run build
```

Expected:

```text
Vitest reports all tests passing
Vite build exits 0
```

- [ ] **Step 6: Planned commit checkpoint**

Only run when the user explicitly authorizes commits:

```bash
git add src/game/GameScene.tsx src/game/feedback.ts src/game/feedback.test.ts
git commit -m "순수 두들 씬 적용"
```

---

### Task 5: Restyle HUD As Paper UI

**Files:**
- Modify: `src/styles.css`
- Modify: `src/ui/GameOverlay.tsx`

- [ ] **Step 1: Add the paper action class**

Modify the start/restart button in `src/ui/GameOverlay.tsx`:

```tsx
<button className="primary-action paper-action" type="button" onClick={onStart}>
  {phase === "game-over" ? "Restart" : "Start"}
</button>
```

Expected: no content or behavior changes besides the class name.

- [ ] **Step 2: Replace dark HUD styling with paper-label styling**

Modify the relevant HUD/panel/button rules in `src/styles.css`:

```css
.game-shell {
  background:
    radial-gradient(circle at 50% 12%, rgba(251, 191, 36, 0.16), transparent 34%),
    #fbfbf9;
}

.scorebar > div,
.panel,
.control-pill {
  background: rgba(255, 255, 255, 0.92);
  border: 3px solid #1f2937;
  box-shadow: 4px 4px 0 #d6d3d1;
  color: #1f2937;
}

.scorebar .label,
.panel .eyebrow {
  color: rgba(31, 41, 55, 0.68);
}

.primary-action,
.paper-action {
  background: #fef08a;
  border: 3px solid #1f2937;
  box-shadow: 4px 4px 0 #d6d3d1;
  color: #1f2937;
}

.primary-action:hover,
.paper-action:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #d6d3d1;
}
```

Preserve existing responsive constraints:

```css
@media (max-width: 640px) {
  .hud {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-height: 560px) {
  .hud-panel-region {
    overflow: auto;
  }
}
```

- [ ] **Step 3: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
eslint exits 0
vite build exits 0
```

- [ ] **Step 4: Planned commit checkpoint**

Only run when the user explicitly authorizes commits:

```bash
git add src/styles.css src/ui/GameOverlay.tsx
git commit -m "종이 스타일 허드 적용"
```

---

### Task 6: Browser Verification And Visual Tuning

**Files:**
- Modify only the files from Tasks 2-5 if verification reveals visual issues.

- [ ] **Step 1: Start local preview**

Run:

```bash
npm run build
npm run preview
```

Expected:

```text
Local: http://127.0.0.1:4173/
```

- [ ] **Step 2: Verify desktop ready state**

Open `http://127.0.0.1:4173/` at `1280x720`.

Expected:

```text
Paper arena is visible.
Doodle player is recognizable before pressing Start.
HUD cards fit without overlap.
No console errors.
```

- [ ] **Step 3: Verify desktop playing state**

Click Start and play for at least 15 seconds.

Expected:

```text
Player leans and legs animate during movement.
Poop hazards read as poop icons.
Red dashed landing warnings are readable.
Score updates.
No console errors.
```

- [ ] **Step 4: Verify mobile portrait**

Set viewport around `390x844`.

Expected:

```text
HUD uses two columns or otherwise fits.
Start/restart panel does not hide all gameplay context.
Controls fit above the safe area.
No horizontal overflow.
```

- [ ] **Step 5: Verify mobile landscape**

Set viewport around `667x375`.

Expected:

```text
Ready and game-over panels remain usable.
Final score and restart button remain reachable.
No horizontal overflow.
No incoherent text overlap.
```

- [ ] **Step 6: Tune only if a verification failure is observed**

If the player still looks too plain, adjust in `src/game/visuals/DoodlePlayer.tsx`:

```tsx
<mesh position={[0, 0.08, 0.31]} scale={[1.08, 0.4, 0.12]}>
```

If hazards are too hard to identify, adjust in `src/game/visuals/DoodleHazard.tsx`:

```tsx
<PoopBlob y={-0.16} scale={[1.38, 0.52, 0.96]} color={darkBrown} />
```

If warning rings clutter the field, adjust in `src/game/visuals/doodleStyle.ts`:

```ts
opacity: round(progress * 0.58),
```

After any tuning change, rerun:

```bash
npm run test
npm run build
```

Expected:

```text
Vitest reports all tests passing
Vite build exits 0
```

---

### Task 7: Documentation, Retrospective, And Final Verification

**Files:**
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-12-pure-doodle-redesign.md`

- [ ] **Step 1: Update handoff**

Add this bullet to the MVP/current-state list in `docs/handoff.md` after the game-polish bullet:

```markdown
- Pure Doodle visual redesign with paper arena, doodle mascot player, poop-icon hazards, red dashed warning rings, and paper-label HUD styling
```

Add this note under `## Notes`:

```markdown
- The selected visual direction is C1 Pure Doodle: preserve the old poop-dodge sketch feeling while using deliberate outlines, paper surfaces, and stronger mascot readability.
```

- [ ] **Step 2: Add retrospective**

Create `docs/retrospectives/2026-06-12-pure-doodle-redesign.md`:

```markdown
# Pure Doodle Redesign Retrospective

## Summary

Implemented the C1 Pure Doodle direction for `poop-dodge-3d`: paper-like arena, doodle mascot player, poop-icon hazards, red dashed warning rings, and paper-label HUD styling.

## What Went Well

- The selected style preserves the old poop-dodge reference without keeping the raw Windows-era look.
- Visual components are split from the game loop, making future tuning easier.
- Pure helper tests cover the numeric parts of the visual treatment.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- Browser check: desktop `1280x720`
- Browser check: mobile portrait around `390x844`
- Browser check: mobile landscape around `667x375`

## Follow-Ups

- Real-device mobile testing on iOS Safari and Android Chrome.
- Consider sound effects after visual direction is accepted.
- Consider a future character select only after the core mascot feels strong.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run lint
npm run test
npm run build
git diff --check
```

Expected:

```text
eslint exits 0
Vitest reports all tests passing
Vite build exits 0
git diff --check exits 0
```

- [ ] **Step 4: Planned commit checkpoint**

Only run when the user explicitly authorizes commits:

```bash
git add docs/handoff.md docs/retrospectives/2026-06-12-pure-doodle-redesign.md
git commit -m "순수 두들 리디자인 문서 정리"
```

- [ ] **Step 5: Planned push checkpoint**

Only run when the user explicitly authorizes push:

```bash
git push -u origin feature/pure-doodle-redesign
```

Expected:

```text
feature/pure-doodle-redesign -> feature/pure-doodle-redesign
```

---

## Final Review Checklist

- [ ] The yellow capsule is gone.
- [ ] Player reads as a doodle mascot at desktop and mobile viewport sizes.
- [ ] Hazards read as poop icons, not brown rocks.
- [ ] Paper arena replaces the dark sci-fi board.
- [ ] Warning cues are red dashed landing rings.
- [ ] HUD matches paper/doodle styling.
- [ ] No layout overlap in ready, playing, or game-over states.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `git diff --check` passes.
