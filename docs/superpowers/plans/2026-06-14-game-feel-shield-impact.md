# Game Feel Shield Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the C1 Pure Doodle game feel better moment-to-moment by making shield pickup, shield saves, close calls, combos, and game-over recap more tactile and readable.

**Architecture:** Preserve the current browser-first React Three Fiber game loop, but keep new rule decisions in pure helpers so they can be unit-tested. Use small visual components for short-lived effects, and use DOM HUD changes only for compact feedback that must stay readable on mobile.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Vitest, ESLint.

---

## Current Baseline

- Current branch: `feature/pure-doodle-redesign`
- Current working tree: dirty with the Pure Doodle plus Close Call Combo/Shield work.
- Current latest committed checkpoint: `7e2439d 게임 폴리시 패스 적용`
- Current gameplay-feel state:
  - Close-call rewards exist.
  - Combo multiplier exists.
  - Shield pickup exists.
  - Shield save continues the run.
  - HUD status chips and callouts exist.
- Current verification gap:
  - Browser automation did not reliably prove shield pickup collection and shield-save continuation through real input.
- Important workflow rule:
  - Do not commit or push unless the user explicitly asks in the current conversation.

## Recommended Branch Flow

Use this flow before implementation:

1. Commit and push the current Pure Doodle plus Close Call Combo/Shield work only if the user explicitly asks.
2. Merge through `develop` according to the repo agreement.
3. Create `feature/game-feel-shield-impact` from the clean integration branch.
4. Execute this plan on the new feature branch.

If the user explicitly chooses to continue without committing first, execute this plan on `feature/pure-doodle-redesign` and keep the handoff clear that two feature passes are stacked in one branch.

## Feature Shape

This pass adds four feel improvements:

1. **Shield Attraction:** Make shield collection more forgiving and visually magnetic when the player gets close.
2. **Shield Save Impact:** Add a short freeze, burst ring, camera shake, and nearby hazard clear when the shield saves the run.
3. **Close-Call Punch:** Make close-call tiers and combo escalation feel more distinct through callout tone and HUD pulse.
4. **Game-Over Recap:** Show why the run was interesting, not only that it ended.

This plan intentionally excludes:

- Sound effects
- Skins or shop systems
- Coins, missions, or daily rewards
- Login, ranking, server work, or analytics
- Deployment

## File Structure

- Create: `src/game/feel.ts`
  - Pure helpers for shield attraction progress, shield save clear radius, callout tone, run summary copy, and game-over recap values.
- Create: `src/game/feel.test.ts`
  - Unit tests for the pure feel helpers.
- Modify: `src/game/tuning.ts`
  - Add `feel` tuning values for attraction radius, collection radius, freeze duration, burst duration, clear radius, close-call pulse duration, and summary thresholds.
- Modify: `src/game/types.ts`
  - Add `CalloutTone`, `RunSummary`, and `ShieldBurst`.
  - Extend `GameStats` with `bestComboMultiplier`, `bestComboStreak`, `calloutTone`, and `runSummary`.
- Modify: `src/app/App.tsx`
  - Keep `initialStats` aligned with the expanded `GameStats` type.
- Modify: `src/game/fun.ts`
  - Use the new collection radius tuning for shield collection.
- Modify: `src/game/fun.test.ts`
  - Update shield collection tests for the new forgiving radius.
- Modify: `src/game/GameScene.tsx`
  - Track best combo.
  - Use shield attraction and shield burst state.
  - Freeze briefly after shield saves.
  - Clear nearby hazards on shield save.
  - Pass richer stats to the overlay.
- Create: `src/game/visuals/ShieldBurst.tsx`
  - Render a short-lived blue doodle burst ring after shield saves.
- Modify: `src/game/visuals/ShieldPickup.tsx`
  - Read the player position ref and visually pull toward the player when close.
- Modify: `src/ui/GameOverlay.tsx`
  - Add callout tone classes and game-over recap metrics.
- Modify: `src/styles.css`
  - Style callout tones, shield burst HUD pulse, and compact game-over recap cards without mobile overflow.
- Modify: `docs/handoff.md`
  - Record feature status, verification, known notes, and next steps.
- Create: `docs/retrospectives/2026-06-14-game-feel-shield-impact.md`
  - Record what changed, verification, and follow-up work.

---

### Task 0: Branch And Baseline Safety

**Files:**
- Read: `docs/handoff.md`
- Read: `docs/superpowers/plans/2026-06-14-close-call-combo-shield.md`
- No source edits.

- [x] **Step 1: Confirm working tree state**

Run:

```bash
git status --short --branch
```

Expected if the previous feature is not committed yet:

```text
## feature/pure-doodle-redesign
 M ...
?? ...
```

If the user has explicitly asked to commit and push the current feature, do that before this plan. If the user has not explicitly asked, do not commit or push.

- [x] **Step 2: Choose branch execution path**

Use this decision table:

```text
Current feature committed and merged to develop -> create feature/game-feel-shield-impact from develop.
Current feature committed but not merged -> create feature/game-feel-shield-impact from feature/pure-doodle-redesign.
Current feature not committed and user says continue -> stay on feature/pure-doodle-redesign and document stacked work.
Current feature not committed and user does not choose -> stop and ask.
```

- [x] **Step 3: Run baseline verification**

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

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

---

### Task 1: Add Pure Feel Helpers With Tests

**Files:**
- Create: `src/game/feel.ts`
- Create: `src/game/feel.test.ts`
- Modify: `src/game/tuning.ts`
- Modify: `src/game/types.ts`
- Modify: `src/app/App.tsx`

- [x] **Step 1: Extend tuning**

Add this sibling block after `fun` in `src/game/tuning.ts`:

```ts
  feel: {
    shieldAttractRadius: 1.55,
    shieldCollectRadius: 1.02,
    shieldSaveFreezeSeconds: 0.18,
    shieldSaveBurstSeconds: 0.62,
    shieldSaveClearRadius: 1.75,
    closeCallPulseSeconds: 0.62,
    panicComboSummaryMinimum: 3,
  },
```

Expected placement:

```ts
  fun: {
    closeCallNiceDistance: 1.35,
    closeCallCloseDistance: 1.0,
    closeCallPanicDistance: 0.74,
    closeCallVerticalWindowMinY: -0.85,
    closeCallVerticalWindowMaxY: 1.15,
    comboTimeoutSeconds: 3.2,
    comboMultiplierCap: 4,
    closeCallBonus: {
      nice: 20,
      close: 45,
      panic: 80,
    },
    shieldSpawnFirstSeconds: 11,
    shieldSpawnIntervalSeconds: 16,
    shieldPickupRadius: 0.78,
    shieldPickupExpiresSeconds: 9,
  },
  feel: {
    shieldAttractRadius: 1.55,
    shieldCollectRadius: 1.02,
    shieldSaveFreezeSeconds: 0.18,
    shieldSaveBurstSeconds: 0.62,
    shieldSaveClearRadius: 1.75,
    closeCallPulseSeconds: 0.62,
    panicComboSummaryMinimum: 3,
  },
```

- [x] **Step 2: Extend shared types**

Add these exports to `src/game/types.ts`:

```ts
export type CalloutTone = "neutral" | "hot" | "panic" | "shield";

export type RunSummary = {
  title: string;
  detail: string;
};

export type ShieldBurst = {
  id: number;
  x: number;
  z: number;
  startedAtSeconds: number;
  expiresAtSeconds: number;
};
```

Extend `GameStats`:

```ts
export type GameStats = {
  score: number;
  highScore: number;
  dodged: number;
  elapsedSeconds: number;
  closeCalls: number;
  comboMultiplier: number;
  bestComboMultiplier: number;
  bestComboStreak: number;
  shieldActive: boolean;
  shieldSaves: number;
  callout: string | null;
  calloutId: number;
  calloutTone: CalloutTone;
  runSummary: RunSummary;
};
```

- [x] **Step 3: Keep app initial stats type-safe**

Update `initialStats` in `src/app/App.tsx`:

```ts
const initialStats: GameStats = {
  score: 0,
  highScore: 0,
  dodged: 0,
  elapsedSeconds: 0,
  closeCalls: 0,
  comboMultiplier: 1,
  bestComboMultiplier: 1,
  bestComboStreak: 0,
  shieldActive: false,
  shieldSaves: 0,
  callout: null,
  calloutId: 0,
  calloutTone: "neutral",
  runSummary: {
    title: "Blank page",
    detail: "Start a run.",
  },
};
```

- [x] **Step 4: Write failing feel helper tests**

Create `src/game/feel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getCalloutTone,
  getRunSummary,
  getShieldPullProgress,
  isInsideShieldSaveClearRadius,
} from "./feel";

describe("feel helpers", () => {
  it("ramps shield pull only near the pickup", () => {
    expect(getShieldPullProgress(2)).toBe(0);
    expect(getShieldPullProgress(1.55)).toBe(0);
    expect(getShieldPullProgress(1.02)).toBe(1);
    expect(getShieldPullProgress(0.4)).toBe(1);
    expect(getShieldPullProgress(1.285)).toBeCloseTo(0.5, 2);
  });

  it("classifies callout tone by event", () => {
    expect(getCalloutTone("nice", 1, false)).toBe("neutral");
    expect(getCalloutTone("close", 2, false)).toBe("hot");
    expect(getCalloutTone("panic", 1, false)).toBe("panic");
    expect(getCalloutTone(null, 1, true)).toBe("shield");
  });

  it("detects hazards cleared by shield save radius", () => {
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.2, z: 0.8 })).toBe(true);
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 2.2, z: 0 })).toBe(false);
  });

  it("summarizes runs by their strongest hook", () => {
    expect(
      getRunSummary({
        closeCalls: 0,
        bestComboMultiplier: 1,
        bestComboStreak: 0,
        shieldSaves: 0,
        dodged: 4,
      })
    ).toEqual({
      title: "Clean paper",
      detail: "4 drops dodged.",
    });

    expect(
      getRunSummary({
        closeCalls: 5,
        bestComboMultiplier: 3,
        bestComboStreak: 3,
        shieldSaves: 0,
        dodged: 18,
      })
    ).toEqual({
      title: "Risky doodler",
      detail: "5 close calls and a x3 combo.",
    });

    expect(
      getRunSummary({
        closeCalls: 2,
        bestComboMultiplier: 2,
        bestComboStreak: 2,
        shieldSaves: 1,
        dodged: 12,
      })
    ).toEqual({
      title: "Shield clutch",
      detail: "1 shield save kept the page alive.",
    });
  });
});
```

- [x] **Step 5: Run failing feel tests**

Run:

```bash
npm run test -- src/game/feel.test.ts
```

Expected:

```text
FAIL src/game/feel.test.ts
Cannot find module './feel'
```

- [x] **Step 6: Implement `src/game/feel.ts`**

Create `src/game/feel.ts`:

```ts
import { GAME_TUNING } from "./tuning";
import type { CalloutTone, CloseCallTier, Position, RunSummary } from "./types";

type RunSummaryInput = {
  closeCalls: number;
  bestComboMultiplier: number;
  bestComboStreak: number;
  shieldSaves: number;
  dodged: number;
};

type FlatPosition = Pick<Position, "x" | "z">;

export function getShieldPullProgress(distance: number) {
  const attractRadius = GAME_TUNING.feel.shieldAttractRadius;
  const collectRadius = GAME_TUNING.feel.shieldCollectRadius;

  if (distance >= attractRadius) {
    return 0;
  }
  if (distance <= collectRadius) {
    return 1;
  }

  return round((attractRadius - distance) / (attractRadius - collectRadius));
}

export function getCalloutTone(
  tier: CloseCallTier | null,
  multiplier: number,
  shieldEvent: boolean
): CalloutTone {
  if (shieldEvent) {
    return "shield";
  }
  if (tier === "panic") {
    return "panic";
  }
  if (tier === "close" || multiplier > 1) {
    return "hot";
  }
  return "neutral";
}

export function isInsideShieldSaveClearRadius(origin: FlatPosition, target: FlatPosition) {
  return Math.hypot(origin.x - target.x, origin.z - target.z) <= GAME_TUNING.feel.shieldSaveClearRadius;
}

export function getRunSummary(input: RunSummaryInput): RunSummary {
  if (input.shieldSaves > 0) {
    return {
      title: "Shield clutch",
      detail: `${input.shieldSaves} shield save${input.shieldSaves === 1 ? "" : "s"} kept the page alive.`,
    };
  }

  if (
    input.closeCalls >= GAME_TUNING.feel.panicComboSummaryMinimum ||
    input.bestComboMultiplier >= 3
  ) {
    return {
      title: "Risky doodler",
      detail: `${input.closeCalls} close calls and a x${input.bestComboMultiplier} combo.`,
    };
  }

  return {
    title: "Clean paper",
    detail: `${input.dodged} drops dodged.`,
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
```

- [x] **Step 7: Run feel tests**

Run:

```bash
npm run test -- src/game/feel.test.ts
```

Expected:

```text
PASS src/game/feel.test.ts
4 tests passed
```

---

### Task 2: Make Shield Pickup Forgiving And Readable

**Files:**
- Modify: `src/game/fun.ts`
- Modify: `src/game/fun.test.ts`
- Modify: `src/game/visuals/ShieldPickup.tsx`
- Modify: `src/game/GameScene.tsx`

- [x] **Step 1: Update shield collection test**

In `src/game/fun.test.ts`, update the shield collection test:

```ts
  it("detects shield collection with the forgiving feel radius", () => {
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 0.72, z: 0.72, expiresAtSeconds: 9 })
    ).toBe(true);
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 1.1, z: 0, expiresAtSeconds: 9 })
    ).toBe(false);
  });
```

- [x] **Step 2: Run failing collection test**

Run:

```bash
npm run test -- src/game/fun.test.ts
```

Expected:

```text
FAIL src/game/fun.test.ts
expected false to be true
```

- [x] **Step 3: Use feel collection radius**

Update `isShieldCollected` in `src/game/fun.ts`:

```ts
export function isShieldCollected(player: Position, pickup: ShieldPickup) {
  const distance = Math.hypot(player.x - pickup.x, player.z - pickup.z);
  return distance <= GAME_TUNING.feel.shieldCollectRadius;
}
```

- [x] **Step 4: Pass player position into `ShieldPickup`**

Update the import in `src/game/visuals/ShieldPickup.tsx`:

```ts
import type { MutableRefObject } from "react";
import type { Group } from "three";
import type { Position, ShieldPickup as ShieldPickupData } from "../types";
import { getShieldPullProgress } from "../feel";
```

Update props:

```ts
type ShieldPickupProps = {
  pickup: ShieldPickupData;
  playerPositionRef: MutableRefObject<Position>;
};
```

Update signature:

```ts
export function ShieldPickup({ pickup, playerPositionRef }: ShieldPickupProps) {
```

Inside `useFrame`, after the null guard and before `ref.current.position.y = bobY`, add:

```ts
    const playerPosition = playerPositionRef.current;
    const distance = Math.hypot(playerPosition.x - pickup.x, playerPosition.z - pickup.z);
    const pull = getShieldPullProgress(distance);
    const visualX = pickup.x + (playerPosition.x - pickup.x) * pull * 0.28;
    const visualZ = pickup.z + (playerPosition.z - pickup.z) * pull * 0.28;

    ref.current.position.x = visualX;
    ref.current.position.z = visualZ;
```

Keep the existing bob line after that:

```ts
    ref.current.position.y = bobY;
```

- [x] **Step 5: Update scene render call**

Update `src/game/GameScene.tsx`:

```tsx
      {renderShieldPickup && (
        <ShieldPickup
          pickup={renderShieldPickup}
          playerPositionRef={playerPosition}
        />
      )}
```

- [x] **Step 6: Run tests and build**

Run:

```bash
npm run test -- src/game/fun.test.ts src/game/feel.test.ts
npm run build
```

Expected:

```text
Vitest passes fun and feel tests
Vite build exits 0
```

---

### Task 3: Add Shield Save Freeze And Burst

**Files:**
- Create: `src/game/visuals/ShieldBurst.tsx`
- Modify: `src/game/GameScene.tsx`
- Modify: `src/game/types.ts`
- Test: `src/game/feel.test.ts`

- [x] **Step 1: Add clear-radius regression test**

Extend `src/game/feel.test.ts`:

```ts
  it("keeps clear radius strict at the edge", () => {
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.75, z: 0 })).toBe(true);
    expect(isInsideShieldSaveClearRadius({ x: 0, z: 0 }, { x: 1.76, z: 0 })).toBe(false);
  });
```

- [x] **Step 2: Run feel tests**

Run:

```bash
npm run test -- src/game/feel.test.ts
```

Expected:

```text
PASS src/game/feel.test.ts
```

- [x] **Step 3: Create `ShieldBurst` visual component**

Create `src/game/visuals/ShieldBurst.tsx`:

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import type { Group, MeshBasicMaterial } from "three";
import type { ShieldBurst as ShieldBurstData } from "../types";

type ShieldBurstProps = {
  burst: ShieldBurstData;
  elapsedSecondsRef: MutableRefObject<number>;
};

export function ShieldBurst({ burst, elapsedSecondsRef }: ShieldBurstProps) {
  const ref = useRef<Group>(null);
  const outerMaterialRef = useRef<MeshBasicMaterial>(null);
  const innerMaterialRef = useRef<MeshBasicMaterial>(null);

  useFrame(() => {
    const progress = Math.min(
      1,
      Math.max(
        0,
        (elapsedSecondsRef.current - burst.startedAtSeconds) /
          (burst.expiresAtSeconds - burst.startedAtSeconds)
      )
    );
    const opacity = Math.max(0, 1 - progress);

    if (!ref.current) {
      return;
    }
    const scale = 0.65 + progress * 2.4;
    ref.current.scale.set(scale, scale, scale);
    if (outerMaterialRef.current) {
      outerMaterialRef.current.opacity = opacity * 0.86;
    }
    if (innerMaterialRef.current) {
      innerMaterialRef.current.opacity = opacity * 0.72;
    }
  });

  return (
    <group ref={ref} position={[burst.x, 0.18, burst.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.34, 0.42, 40]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color="#60a5fa"
          transparent
          opacity={0.86}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[0.5, 0.56, 40]} />
        <meshBasicMaterial
          ref={innerMaterialRef}
          color="#fef08a"
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
```

- [x] **Step 4: Add shield burst refs to scene**

Update imports in `src/game/GameScene.tsx`:

```ts
import { getCalloutTone, getRunSummary, isInsideShieldSaveClearRadius } from "./feel";
import type {
  ComboState,
  GamePhase,
  GameStats,
  InputVector,
  Obstacle,
  Position,
  ShieldBurst as ShieldBurstData,
  ShieldPickup as ShieldPickupData,
} from "./types";
import { ShieldBurst } from "./visuals/ShieldBurst";
```

Add refs after `impactTimer`:

```ts
  const freezeTimer = useRef(0);
  const bestComboMultiplier = useRef(1);
  const bestComboStreak = useRef(0);
  const calloutTone = useRef<GameStats["calloutTone"]>("neutral");
  const [renderShieldBurst, setRenderShieldBurst] = useState<ShieldBurstData | null>(null);
```

Reset them inside the `runId` effect:

```ts
    freezeTimer.current = 0;
    bestComboMultiplier.current = 1;
    bestComboStreak.current = 0;
    calloutTone.current = "neutral";
    setRenderShieldBurst(null);
```

- [x] **Step 5: Freeze simulation after shield save**

After camera setup and before `phase !== "playing"` handling, add:

```ts
    if (freezeTimer.current > 0) {
      freezeTimer.current = Math.max(0, freezeTimer.current - dt);
      state.camera.lookAt(0, 0, 0);
      return;
    }
```

This freezes obstacle/player simulation for a short shield-save hit stop while the frame still renders.

- [x] **Step 6: Clear nearby hazards on shield save**

Replace the shield collision branch filter in `src/game/GameScene.tsx`:

```ts
        const burst: ShieldBurstData = {
          id: calloutId.current,
          x: playerPosition.current.x,
          z: playerPosition.current.z,
          startedAtSeconds: elapsed.current,
          expiresAtSeconds: elapsed.current + GAME_TUNING.feel.shieldSaveBurstSeconds,
        };
        freezeTimer.current = GAME_TUNING.feel.shieldSaveFreezeSeconds;
        setRenderShieldBurst(burst);
        obstacles.current = obstacles.current.filter(
          (obstacle) =>
            !isInsideShieldSaveClearRadius(playerPosition.current, {
              x: obstacle.x,
              z: obstacle.z,
            })
        );
```

Set shield callout tone in the same branch:

```ts
        calloutTone.current = "shield";
```

- [x] **Step 7: Expire shield burst**

Near shield pickup expiry handling, add:

```ts
    if (renderShieldBurst && elapsed.current >= renderShieldBurst.expiresAtSeconds) {
      setRenderShieldBurst(null);
    }
```

- [x] **Step 8: Render shield burst**

After `ShieldPickup`, render:

```tsx
      {renderShieldBurst && (
        <ShieldBurst
          burst={renderShieldBurst}
          elapsedSecondsRef={elapsed}
        />
      )}
```

- [x] **Step 9: Run build**

Run:

```bash
npm run build
```

Expected:

```text
Vite build exits 0
```

---

### Task 4: Make Close Calls And Combos Feel Distinct

**Files:**
- Modify: `src/game/GameScene.tsx`
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Track best combo when awarding close calls**

In `src/game/GameScene.tsx`, after:

```ts
          combo.current = getNextCombo(combo.current, elapsed.current);
```

Add:

```ts
          bestComboMultiplier.current = Math.max(
            bestComboMultiplier.current,
            combo.current.multiplier
          );
          bestComboStreak.current = Math.max(bestComboStreak.current, combo.current.streak);
```

- [x] **Step 2: Set callout tone by close-call tier**

In the same close-call branch, after assigning `callout.current`, add:

```ts
          calloutTone.current = getCalloutTone(tier, combo.current.multiplier, false);
```

- [x] **Step 3: Include best combo and tone in stats**

In every `GameStats` object created inside `GameScene.tsx`, include:

```ts
        bestComboMultiplier: bestComboMultiplier.current,
        bestComboStreak: bestComboStreak.current,
        calloutTone: calloutTone.current,
        runSummary: getRunSummary({
          closeCalls: closeCalls.current,
          bestComboMultiplier: bestComboMultiplier.current,
          bestComboStreak: bestComboStreak.current,
          shieldSaves: shieldSaves.current,
          dodged: dodged.current,
        }),
```

- [x] **Step 4: Add tone class to callout**

Update `src/ui/GameOverlay.tsx`:

```tsx
          <div
            className={`doodle-callout is-${stats.calloutTone}`}
            key={stats.calloutId}
            role="status"
            aria-live="polite"
          >
            {stats.callout}
          </div>
```

- [x] **Step 5: Style tone variants**

Add to `src/styles.css` near `.doodle-callout`:

```css
.doodle-callout.is-hot {
  background: #fef3c7;
  color: #7c2d12;
  transform: rotate(-1deg);
}

.doodle-callout.is-panic {
  background: #fecaca;
  color: #7f1d1d;
  transform: rotate(1deg) scale(1.08);
}

.doodle-callout.is-shield {
  background: #bfdbfe;
  color: #172554;
  box-shadow: 0 5px 0 rgba(30, 64, 175, 0.24);
}

.status-chip.is-hot {
  animation: chip-bump 560ms ease-out;
}

.status-chip.is-shielded {
  animation: chip-bump 700ms ease-out;
}

@keyframes chip-bump {
  0% {
    transform: translateY(0) scale(1);
  }
  45% {
    transform: translateY(-2px) scale(1.06);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}
```

Ensure the reduced-motion block keeps this accessible:

```css
@media (prefers-reduced-motion: reduce) {
  .status-chip.is-hot,
  .status-chip.is-shielded {
    animation: none;
  }
}
```

- [x] **Step 6: Run lint and build**

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

---

### Task 5: Add Game-Over Recap

**Files:**
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/styles.css`
- Test: `src/game/feel.test.ts`

- [x] **Step 1: Add game-over recap markup**

Inside the `phase === "game-over"` branch in `src/ui/GameOverlay.tsx`, immediately after `.final-score`, add:

```tsx
                <div className="run-recap" aria-label="Run recap">
                  <div>
                    <span>Close calls</span>
                    <strong>{stats.closeCalls.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Best combo</span>
                    <strong>x{stats.bestComboMultiplier}</strong>
                  </div>
                  <div>
                    <span>Shield saves</span>
                    <strong>{stats.shieldSaves}</strong>
                  </div>
                </div>
                <p className="run-summary">
                  <strong>{stats.runSummary.title}</strong>
                  <span>{stats.runSummary.detail}</span>
                </p>
```

- [x] **Step 2: Style recap compactly**

Add to `src/styles.css` near `.final-score`:

```css
.run-recap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: min(100%, 420px);
}

.run-recap div {
  border: 3px solid #111827;
  border-radius: 8px;
  background: #fffdf4;
  box-shadow: 0 4px 0 rgba(17, 24, 39, 0.18);
  padding: 8px;
  min-width: 0;
}

.run-recap span,
.run-summary span {
  display: block;
  color: #6b5f55;
  font-size: 0.68rem;
  line-height: 1.15;
  text-transform: uppercase;
}

.run-recap strong {
  display: block;
  color: #111827;
  font-size: clamp(1rem, 4vw, 1.45rem);
  line-height: 1;
}

.run-summary {
  display: grid;
  gap: 3px;
  max-width: min(100%, 440px);
  margin: 0;
}

.run-summary strong {
  color: #111827;
  font-size: clamp(1rem, 4vw, 1.35rem);
  line-height: 1.05;
}
```

Inside the existing small-height media query, add:

```css
  .run-recap {
    gap: 5px;
  }

  .run-recap div {
    padding: 5px;
    border-width: 2px;
    box-shadow: 0 2px 0 rgba(17, 24, 39, 0.16);
  }

  .run-summary {
    display: none;
  }
```

- [x] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
eslint exits 0
```

---

### Task 6: Browser Verification And Tuning

**Files:**
- Modify source files only if browser checks reveal visual/layout issues.

- [x] **Step 1: Start local dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected:

```text
Local: http://127.0.0.1:5173/
```

If `5173` is already in use, use Vite's next offered port.

- [x] **Step 2: Verify desktop**

Open the local URL and verify:

```text
Viewport: 1280x720
Ready state fits
Shield pickup visibly pulls or pops when the player gets close
Shield pickup can be collected by normal keyboard play
Shield save freezes briefly, clears nearby hazards, shows the burst, and keeps the run alive
Close-call callout tone changes for NICE/CLOSE/PANIC
Game-over recap shows close calls, best combo, shield saves, and summary
No horizontal or vertical overflow
No runtime console errors
```

- [x] **Step 3: Verify mobile portrait**

Verify:

```text
Viewport: 390x844
Score cards and status chips fit
Callout text does not overlap controls
Shield pickup remains visible
Game-over recap fits without horizontal overflow
No horizontal or vertical overflow
```

- [x] **Step 4: Verify mobile landscape**

Verify:

```text
Viewport: 667x375
Status chips do not push the arena out of view
Game-over recap remains usable
Controls remain visible
No horizontal or vertical overflow
```

- [x] **Step 5: Tune only with concrete evidence**

Use these changes only if browser verification shows the named issue:

```text
Shield still hard to collect -> increase feel.shieldCollectRadius from 1.02 to 1.12.
Shield visual pulls too aggressively -> reduce the visual pull multiplier in ShieldPickup from 0.28 to 0.18.
Shield save feels too long -> reduce shieldSaveFreezeSeconds from 0.18 to 0.12.
Mobile landscape recap crowds controls -> hide .run-recap labels in max-height media query.
Close-call callouts fire too loudly -> remove scale from .doodle-callout.is-panic.
```

---

### Task 7: Documentation And Final Verification

**Files:**
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-14-game-feel-shield-impact.md`

- [x] **Step 1: Update handoff**

Append this to `docs/handoff.md` notes:

```markdown
- The Game Feel Shield Impact pass improves shield pickup forgiveness, shield-save impact, close-call callout tone, and game-over run recap.
- Browser verification should include real keyboard collection of a shield, shield-save continuation, close-call callout tone, desktop, mobile portrait, and mobile landscape.
```

- [x] **Step 2: Create retrospective**

Create `docs/retrospectives/2026-06-14-game-feel-shield-impact.md`:

```markdown
# Game Feel Shield Impact Retrospective

## What Changed

- Made shield pickup more forgiving.
- Added shield pickup visual attraction near the player.
- Added shield-save freeze, burst, and nearby hazard clear.
- Added callout tone differences for close calls and shield events.
- Added game-over recap metrics and run summary.

## What Went Well

- Pure helpers kept feel decisions testable.
- Small visual components kept the scene easier to reason about.
- Browser checks kept the mobile HUD and game-over panel honest.

## What Was Tricky

- Shield pickup needs to be forgiving without feeling automatic.
- Shield-save freeze needs to feel punchy without interrupting control too long.
- Mobile landscape has very little vertical room for richer recap content.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- `git diff --check`
- Desktop browser check
- Mobile portrait browser check
- Mobile landscape browser check
- Browser console check for runtime errors

## Follow-Up Work

- Add sound effects only after user approval.
- Consider haptic-style screen pulses for mobile after real-device testing.
- Consider lightweight missions only after the base loop feels good.
```

- [x] **Step 3: Run final verification**

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

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

- [ ] **Step 4: Commit checkpoint only with explicit approval**

Do not run these commands unless the user explicitly says to commit/push:

```bash
git add .
git commit -m "방패와 근접 회피 손맛 개선"
git push -u origin feature/game-feel-shield-impact
```

If this work is executed on `feature/pure-doodle-redesign`, ask the user whether to keep the stacked branch or split it before pushing.

---

## Self-Review

- Spec coverage: The plan covers shield pickup forgiveness, shield-save impact, close-call tone, game-over recap, browser verification, handoff, and retrospective.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `CalloutTone`, `RunSummary`, `ShieldBurst`, `bestComboMultiplier`, `bestComboStreak`, `calloutTone`, and `runSummary` are introduced before use.
- Scope check: This is one gameplay-feel pass. It does not include sound, skins, economy, ranking, login, server work, or deployment.
