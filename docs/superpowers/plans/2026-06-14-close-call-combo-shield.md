# Close Call Combo And Shield Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the C1 Pure Doodle game feel more fun by rewarding near misses, showing short doodle reactions, and adding a single-use shield pickup.

**Architecture:** Keep gameplay rules inside `GameScene.tsx`, but move close-call, combo, shield pickup, and bonus scoring decisions into pure helpers under `src/game/fun.ts`. Render the shield pickup as a small React Three Fiber component and render combo/shield feedback through the existing DOM HUD so it stays responsive and mobile-safe.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Vitest, ESLint.

---

## Current Baseline

- Current branch: `feature/pure-doodle-redesign`
- Current visual direction: C1 Pure Doodle
- Current score model: `elapsedSeconds * 12 + dodged * 35`
- Current play loop: obstacles spawn/fall in `src/game/GameScene.tsx`; collision ends the run immediately.
- Current HUD: `src/ui/GameOverlay.tsx` displays score, best, dodged, and time.
- Important workflow rule: do not commit or push unless the user explicitly asks for it in the current conversation.

## Feature Shape

Add three connected fun loops:

1. **Close Call:** When a falling hazard passes very close to the player without collision, award a label and bonus points.
2. **Combo:** Consecutive close calls keep a short combo alive and increase the bonus multiplier.
3. **Shield:** A small shield pickup appears occasionally. Collecting it gives one saved hit. On the next collision, the shield breaks, the obstacle is removed, and the run continues.

This plan intentionally excludes:

- Sound effects
- Permanent upgrades
- Coins or shop systems
- Login, ranking, or server work
- New image/model assets
- Deployment

## File Structure

- Create: `src/game/fun.ts`
  - Pure helpers for close-call tiering, combo updates, bonus score, shield pickup collection, shield spawn timing, and shield save behavior.
- Create: `src/game/fun.test.ts`
  - Unit tests for all pure helper behavior.
- Modify: `src/game/types.ts`
  - Add `CloseCallTier`, `ComboState`, `ShieldPickup`, and expanded `GameStats` fields.
- Modify: `src/app/App.tsx`
  - Keep `initialStats` aligned with the expanded `GameStats` type.
- Modify: `src/game/GameScene.tsx`
  - Keep existing `nextStats` creation build-safe until the full scene integration task replaces those defaults.
- Modify: `src/game/tuning.ts`
  - Add thresholds for close calls, combo timeout, combo multiplier cap, shield spawn timing, shield pickup radius, and shield duration/expiry.
- Modify: `src/game/logic.ts`
  - Update `getScore` to include `bonusScore`.
- Modify: `src/game/logic.test.ts`
  - Update score tests for the bonus score argument.
- Modify: `src/game/GameScene.tsx`
  - Track close-call distance per obstacle, award combo/bonus on avoid, spawn/collect shield pickups, consume shield on hit, and pass new stats upward.
- Create: `src/game/visuals/ShieldPickup.tsx`
  - Render a doodle paper shield pickup on the arena floor.
- Modify: `src/ui/GameOverlay.tsx`
  - Render combo/shield status chips and short floating callouts.
- Modify: `src/styles.css`
  - Style combo chips, shield chip, and callout text without causing mobile overflow.
- Modify: `docs/handoff.md`
  - Record feature status, verification, known notes, and next steps.
- Create: `docs/retrospectives/2026-06-14-close-call-combo-shield.md`
  - Record what changed, verification, and follow-up work.

---

### Task 1: Baseline And Branch Safety

**Files:**
- Read: `docs/handoff.md`
- Read: `docs/superpowers/plans/2026-06-12-pure-doodle-redesign.md`
- No source edits.

- [x] **Step 1: Confirm branch and dirty state**

Run:

```bash
git status --short --branch
```

Expected:

```text
## feature/pure-doodle-redesign
```

There may already be uncommitted Pure Doodle changes. Do not revert them.

- [x] **Step 2: Run baseline verification**

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

### Task 2: Add Pure Fun Helpers With TDD

**Files:**
- Create: `src/game/fun.ts`
- Create: `src/game/fun.test.ts`
- Modify: `src/game/tuning.ts`
- Modify: `src/game/types.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/game/GameScene.tsx`

- [x] **Step 1: Extend tuning**

Add this block to `GAME_TUNING` in `src/game/tuning.ts`:

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
```

- [x] **Step 2: Extend shared types**

Add these exports to `src/game/types.ts`:

```ts
export type CloseCallTier = "nice" | "close" | "panic";

export type ComboState = {
  multiplier: number;
  streak: number;
  expiresAtSeconds: number;
};

export type ShieldPickup = {
  id: string;
  x: number;
  z: number;
  expiresAtSeconds: number;
};
```

Extend `Obstacle`:

```ts
export type Obstacle = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  rotation: number;
  spin: number;
  closestSafeDistance?: number;
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
  shieldActive: boolean;
  shieldSaves: number;
  callout: string | null;
  calloutId: number;
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
  shieldActive: false,
  shieldSaves: 0,
  callout: null,
  calloutId: 0,
};
```

- [x] **Step 4: Write failing helper tests**

- [x] **Step 4: Keep existing scene stats type-safe**

Update the existing `nextStats` object in `src/game/GameScene.tsx` with neutral default fun fields. Later integration tasks will replace these defaults with live state:

```ts
    const nextStats: GameStats = {
      score: getScore(elapsed.current, dodged.current),
      highScore: 0,
      dodged: dodged.current,
      elapsedSeconds: elapsed.current,
      closeCalls: 0,
      comboMultiplier: 1,
      shieldActive: false,
      shieldSaves: 0,
      callout: null,
      calloutId: 0,
    };
```

- [x] **Step 5: Write failing helper tests**

Create `src/game/fun.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createInitialCombo,
  getCloseCallBonus,
  getCloseCallTier,
  getNextCombo,
  getShieldPickupPosition,
  isInCloseCallWindow,
  isShieldCollected,
  shouldSpawnShield,
} from "./fun";

describe("fun helpers", () => {
  it("classifies close calls by distance", () => {
    expect(getCloseCallTier(0.7)).toBe("panic");
    expect(getCloseCallTier(0.95)).toBe("close");
    expect(getCloseCallTier(1.2)).toBe("nice");
    expect(getCloseCallTier(1.5)).toBe(null);
  });

  it("only tracks close calls near the player height window", () => {
    expect(isInCloseCallWindow(1.1)).toBe(true);
    expect(isInCloseCallWindow(-0.8)).toBe(true);
    expect(isInCloseCallWindow(1.3)).toBe(false);
    expect(isInCloseCallWindow(-1)).toBe(false);
  });

  it("builds combo while the timer is alive", () => {
    const first = getNextCombo(createInitialCombo(), 10);
    const second = getNextCombo(first, 12);

    expect(first).toEqual({
      multiplier: 1,
      streak: 1,
      expiresAtSeconds: 13.2,
    });
    expect(second).toEqual({
      multiplier: 2,
      streak: 2,
      expiresAtSeconds: 15.2,
    });
  });

  it("resets combo after timeout", () => {
    const first = getNextCombo(createInitialCombo(), 10);
    const expired = getNextCombo(first, 14);

    expect(expired).toEqual({
      multiplier: 1,
      streak: 1,
      expiresAtSeconds: 17.2,
    });
  });

  it("caps combo multiplier", () => {
    let combo = createInitialCombo();
    combo = getNextCombo(combo, 1);
    combo = getNextCombo(combo, 2);
    combo = getNextCombo(combo, 3);
    combo = getNextCombo(combo, 4);
    combo = getNextCombo(combo, 5);

    expect(combo.multiplier).toBe(4);
    expect(combo.streak).toBe(5);
  });

  it("applies close call bonus with combo multiplier", () => {
    expect(getCloseCallBonus("nice", 1)).toBe(20);
    expect(getCloseCallBonus("close", 2)).toBe(90);
    expect(getCloseCallBonus("panic", 4)).toBe(320);
  });

  it("spawns shield pickups on the first and repeated intervals", () => {
    expect(shouldSpawnShield(10.9, 0, false, null)).toBe(false);
    expect(shouldSpawnShield(11, 0, false, null)).toBe(true);
    expect(shouldSpawnShield(20, 11, false, null)).toBe(false);
    expect(shouldSpawnShield(27, 11, false, null)).toBe(true);
    expect(shouldSpawnShield(27, 11, true, null)).toBe(false);
  });

  it("places shield pickup inside arena bounds", () => {
    expect(getShieldPickupPosition(1)).toEqual({ x: -2.24, z: 0.14 });
    expect(getShieldPickupPosition(12)).toEqual({ x: 1.95, z: -0.83 });
  });

  it("detects shield collection by horizontal distance", () => {
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 0.4, z: 0.3, expiresAtSeconds: 9 })
    ).toBe(true);
    expect(
      isShieldCollected({ x: 0, y: 0.42, z: 0 }, { id: "s", x: 2, z: 2, expiresAtSeconds: 9 })
    ).toBe(false);
  });
});
```

- [x] **Step 6: Run failing helper tests**

Run:

```bash
npm run test -- src/game/fun.test.ts
```

Expected:

```text
Cannot find module './fun'
```

- [x] **Step 7: Implement helper module**

Create `src/game/fun.ts`:

```ts
import { GAME_TUNING } from "./tuning";
import type { CloseCallTier, ComboState, Position, ShieldPickup } from "./types";

export function getCloseCallTier(distance: number): CloseCallTier | null {
  if (distance <= GAME_TUNING.fun.closeCallPanicDistance) {
    return "panic";
  }
  if (distance <= GAME_TUNING.fun.closeCallCloseDistance) {
    return "close";
  }
  if (distance <= GAME_TUNING.fun.closeCallNiceDistance) {
    return "nice";
  }
  return null;
}

export function isInCloseCallWindow(obstacleY: number) {
  return (
    obstacleY >= GAME_TUNING.fun.closeCallVerticalWindowMinY &&
    obstacleY <= GAME_TUNING.fun.closeCallVerticalWindowMaxY
  );
}

export function createInitialCombo(): ComboState {
  return {
    multiplier: 1,
    streak: 0,
    expiresAtSeconds: 0,
  };
}

export function getNextCombo(current: ComboState, elapsedSeconds: number): ComboState {
  const alive = current.streak > 0 && elapsedSeconds <= current.expiresAtSeconds;
  const nextStreak = alive ? current.streak + 1 : 1;
  return {
    multiplier: Math.min(nextStreak, GAME_TUNING.fun.comboMultiplierCap),
    streak: nextStreak,
    expiresAtSeconds: round(elapsedSeconds + GAME_TUNING.fun.comboTimeoutSeconds),
  };
}

export function getCloseCallBonus(tier: CloseCallTier, multiplier: number) {
  return GAME_TUNING.fun.closeCallBonus[tier] * multiplier;
}

export function shouldSpawnShield(
  elapsedSeconds: number,
  lastSpawnedAtSeconds: number,
  shieldActive: boolean,
  activePickup: ShieldPickup | null
) {
  if (shieldActive || activePickup) {
    return false;
  }
  if (lastSpawnedAtSeconds === 0) {
    return elapsedSeconds >= GAME_TUNING.fun.shieldSpawnFirstSeconds;
  }
  return elapsedSeconds - lastSpawnedAtSeconds >= GAME_TUNING.fun.shieldSpawnIntervalSeconds;
}

export function getShieldPickupPosition(seed: number): Pick<ShieldPickup, "x" | "z"> {
  const pickupInset = 1.1;
  const xLimit = GAME_TUNING.arena.width / 2 - pickupInset;
  const zLimit = GAME_TUNING.arena.depth / 2 - pickupInset;

  return {
    x: round(seededRange(seed * 17.17, -xLimit, xLimit)),
    z: round(seededRange(seed * 71.41, -zLimit, zLimit)),
  };
}

export function isShieldCollected(player: Position, pickup: ShieldPickup) {
  const distance = Math.hypot(player.x - pickup.x, player.z - pickup.z);
  return distance <= GAME_TUNING.fun.shieldPickupRadius;
}

function seededRange(seed: number, min: number, max: number) {
  const raw = Math.sin(seed) * 10000;
  const ratio = raw - Math.floor(raw);
  return min + ratio * (max - min);
}

function round(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}
```

- [x] **Step 8: Run helper tests**

Run:

```bash
npm run test -- src/game/fun.test.ts
```

Expected:

```text
✓ src/game/fun.test.ts
```

---

### Task 3: Add Bonus Score Support

**Files:**
- Modify: `src/game/logic.ts`
- Modify: `src/game/logic.test.ts`

- [x] **Step 1: Update score test first**

Change the score test in `src/game/logic.test.ts`:

```ts
  it("calculates score from elapsed time, dodges, and fun bonus", () => {
    expect(getScore(10, 3, 90)).toBe(315);
  });
```

- [x] **Step 2: Run failing score test**

Run:

```bash
npm run test -- src/game/logic.test.ts
```

Expected:

```text
Expected: 315
Received: 225
```

- [x] **Step 3: Update score helper**

Change `getScore` in `src/game/logic.ts`:

```ts
export function getScore(elapsedSeconds: number, dodged: number, bonusScore = 0) {
  return Math.floor(
    elapsedSeconds * GAME_TUNING.score.pointsPerSecond +
      dodged * GAME_TUNING.score.pointsPerDodge +
      bonusScore
  );
}
```

- [x] **Step 4: Run logic tests**

Run:

```bash
npm run test -- src/game/logic.test.ts
```

Expected:

```text
✓ src/game/logic.test.ts
```

---

### Task 4: Integrate Close Call, Combo, And Shield Into GameScene

**Files:**
- Modify: `src/game/GameScene.tsx`

- [x] **Step 1: Add helper imports**

Add these imports to `src/game/GameScene.tsx`:

```ts
import {
  createInitialCombo,
  getCloseCallBonus,
  getCloseCallTier,
  getNextCombo,
  getShieldPickupPosition,
  isInCloseCallWindow,
  isShieldCollected,
  shouldSpawnShield,
} from "./fun";
import type { ComboState, ShieldPickup } from "./types";
```

- [x] **Step 2: Add refs for fun state**

Add these refs near the existing refs:

```ts
  const bonusScore = useRef(0);
  const closeCalls = useRef(0);
  const combo = useRef<ComboState>(createInitialCombo());
  const shieldActive = useRef(false);
  const shieldSaves = useRef(0);
  const shieldPickup = useRef<ShieldPickup | null>(null);
  const [renderShieldPickup, setRenderShieldPickup] = useState<ShieldPickup | null>(null);
  const lastShieldSpawnedAt = useRef(0);
  const callout = useRef<string | null>(null);
  const calloutId = useRef(0);
```

- [x] **Step 3: Reset fun state with run reset**

Inside the `useEffect` reset block, add:

```ts
    bonusScore.current = 0;
    closeCalls.current = 0;
    combo.current = createInitialCombo();
    shieldActive.current = false;
    shieldSaves.current = 0;
    shieldPickup.current = null;
    setRenderShieldPickup(null);
    lastShieldSpawnedAt.current = 0;
    callout.current = null;
    calloutId.current = 0;
```

- [x] **Step 4: Track closest safe distance per obstacle**

Inside the obstacle loop, before `activeObstacles.push(obstacle)`, add:

```ts
      if (isInCloseCallWindow(obstacle.y)) {
        const horizontalDistance = Math.hypot(
          playerPosition.current.x - obstacle.x,
          playerPosition.current.z - obstacle.z
        );
        obstacle.closestSafeDistance = Math.min(
          obstacle.closestSafeDistance ?? Number.POSITIVE_INFINITY,
          horizontalDistance
        );
      }
```

- [x] **Step 5: Award close-call combo when an obstacle is avoided**

Replace the current avoided count handling inside the obstacle loop with:

```ts
      if (obstacle.y > -1.2) {
        activeObstacles.push(obstacle);
      } else {
        avoided += 1;
        const tier = getCloseCallTier(obstacle.closestSafeDistance ?? Number.POSITIVE_INFINITY);
        if (tier) {
          combo.current = getNextCombo(combo.current, elapsed.current);
          const bonus = getCloseCallBonus(tier, combo.current.multiplier);
          bonusScore.current += bonus;
          closeCalls.current += 1;
          callout.current =
            combo.current.multiplier > 1
              ? `${tier.toUpperCase()} x${combo.current.multiplier}`
              : tier.toUpperCase();
          calloutId.current += 1;
        }
      }
```

- [x] **Step 6: Spawn and collect shield pickup**

After player movement and before obstacle spawning, add:

```ts
    const activePickup = shieldPickup.current;
    if (activePickup && elapsed.current >= activePickup.expiresAtSeconds) {
      shieldPickup.current = null;
      setRenderShieldPickup(null);
    }

    if (shieldPickup.current && isShieldCollected(playerPosition.current, shieldPickup.current)) {
      shieldActive.current = true;
      callout.current = "SHIELD!";
      calloutId.current += 1;
      shieldPickup.current = null;
      setRenderShieldPickup(null);
    }

    if (
      shouldSpawnShield(
        elapsed.current,
        lastShieldSpawnedAt.current,
        shieldActive.current,
        shieldPickup.current
      )
    ) {
      const position = getShieldPickupPosition(state.clock.elapsedTime + runId);
      const pickup: ShieldPickup = {
        id: `shield-${runId}-${Math.round(elapsed.current * 1000)}`,
        x: position.x,
        z: position.z,
        expiresAtSeconds: elapsed.current + GAME_TUNING.fun.shieldPickupExpiresSeconds,
      };
      shieldPickup.current = pickup;
      setRenderShieldPickup(pickup);
      lastShieldSpawnedAt.current = elapsed.current;
    }
```

- [x] **Step 7: Consume shield on hit**

Replace the current hit block:

```ts
    if (hit && !gameOverSent.current) {
      gameOverSent.current = true;
      impactTimer.current = GAME_TUNING.visuals.cameraShakeSeconds;
      onGameOver(nextStats);
      return;
    }
```

with:

```ts
    if (hit && !gameOverSent.current) {
      impactTimer.current = GAME_TUNING.visuals.cameraShakeSeconds;

      if (shieldActive.current) {
        shieldActive.current = false;
        shieldSaves.current += 1;
        callout.current = "SHIELD SAVE!";
        calloutId.current += 1;
        obstacles.current = obstacles.current.filter(
          (obstacle) =>
            !isCollision(
              playerPosition.current,
              { x: obstacle.x, y: obstacle.y, z: obstacle.z },
              PLAYER_RADIUS,
              obstacle.radius
            )
        );
        setRenderObstacles([...obstacles.current]);
        onStatsChange({
          ...nextStats,
          shieldActive: shieldActive.current,
          shieldSaves: shieldSaves.current,
          callout: callout.current,
          calloutId: calloutId.current,
        });
        return;
      }

      gameOverSent.current = true;
      onGameOver(nextStats);
      return;
    }
```

- [x] **Step 8: Include fun state in stats**

Build `nextStats` as:

```ts
    const comboAlive =
      combo.current.streak > 0 && elapsed.current <= combo.current.expiresAtSeconds;
    const visibleComboMultiplier = comboAlive ? combo.current.multiplier : 1;

    const nextStats: GameStats = {
      score: getScore(elapsed.current, dodged.current, bonusScore.current),
      highScore: 0,
      dodged: dodged.current,
      elapsedSeconds: elapsed.current,
      closeCalls: closeCalls.current,
      comboMultiplier: visibleComboMultiplier,
      shieldActive: shieldActive.current,
      shieldSaves: shieldSaves.current,
      callout: callout.current,
      calloutId: calloutId.current,
    };
```

- [x] **Step 9: Run tests**

Run:

```bash
npm run test
```

Expected:

```text
All tests pass
```

---

### Task 5: Render Shield Pickup

**Files:**
- Create: `src/game/visuals/ShieldPickup.tsx`
- Modify: `src/game/GameScene.tsx`

- [x] **Step 1: Create shield pickup component**

Create `src/game/visuals/ShieldPickup.tsx`:

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { ShieldPickup as ShieldPickupData } from "../types";

type ShieldPickupProps = {
  pickup: ShieldPickupData;
};

const ink = "#1f2937";
const paper = "#fef08a";
const blue = "#bfdbfe";

export function ShieldPickup({ pickup }: ShieldPickupProps) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) {
      return;
    }
    ref.current.rotation.y = state.clock.elapsedTime * 1.5;
    ref.current.position.y = 0.34 + Math.sin(state.clock.elapsedTime * 4) * 0.04;
  });

  return (
    <group ref={ref} position={[pickup.x, 0.34, pickup.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[0.48, 28]} />
        <meshBasicMaterial color="#9ca3af" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh scale={[0.44, 0.54, 0.1]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0.01, 0.035]} scale={[0.34, 0.43, 0.08]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={paper} roughness={0.78} metalness={0} />
      </mesh>
      <mesh position={[0, 0.06, 0.12]} scale={[0.18, 0.2, 0.04]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshBasicMaterial color={blue} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}
```

- [x] **Step 2: Import and render pickup**

Add this import in `src/game/GameScene.tsx`:

```ts
import { ShieldPickup } from "./visuals/ShieldPickup";
```

Render it after `<DoodlePlayer />`:

```tsx
      {renderShieldPickup && <ShieldPickup pickup={renderShieldPickup} />}
```

- [x] **Step 3: Run TypeScript build**

Run:

```bash
npm run build
```

Expected:

```text
✓ built
```

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

---

### Task 6: Add HUD Combo, Shield, And Callout UI

**Files:**
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Render status chips and callout**

In `src/ui/GameOverlay.tsx`, render this block after the scorebar:

```tsx
      {phase === "playing" && (
        <div className="status-strip" aria-live="polite">
          <span className={stats.comboMultiplier > 1 ? "status-chip is-hot" : "status-chip"}>
            Combo x{stats.comboMultiplier}
          </span>
          <span className={stats.shieldActive ? "status-chip is-shielded" : "status-chip"}>
            {stats.shieldActive ? "Shield ready" : "No shield"}
          </span>
          <span className="status-chip">{stats.closeCalls.toLocaleString()} close calls</span>
        </div>
      )}
```

Render this block inside `.hud-panel-region`, before the panel condition:

```tsx
        {phase === "playing" && stats.callout && (
          <div className="doodle-callout" key={stats.calloutId}>
            {stats.callout}
          </div>
        )}
```

- [x] **Step 2: Add responsive styles**

Add to `src/styles.css`:

```css
.status-strip {
  pointer-events: none;
  justify-self: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: min(680px, calc(100vw - 36px));
}

.status-chip {
  padding: 6px 10px;
  border: 3px solid #1f2937;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 3px 3px 0 #d6d3d1;
  color: #1f2937;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
}

.status-chip.is-hot {
  background: #fef08a;
}

.status-chip.is-shielded {
  background: #bfdbfe;
}

.doodle-callout {
  align-self: center;
  justify-self: center;
  padding: 8px 14px;
  border: 3px solid #1f2937;
  border-radius: 8px;
  background: #fef08a;
  box-shadow: 5px 5px 0 #d6d3d1;
  color: #1f2937;
  font-size: clamp(22px, 5vw, 34px);
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
  animation: doodle-pop 700ms ease-out both;
}

@keyframes doodle-pop {
  0% {
    opacity: 0;
    transform: translateY(8px) rotate(-2deg) scale(0.86);
  }
  18% {
    opacity: 1;
    transform: translateY(0) rotate(1deg) scale(1.06);
  }
  100% {
    opacity: 0;
    transform: translateY(-16px) rotate(-1deg) scale(1);
  }
}
```

In `@media (max-width: 620px)`, add:

```css
  .status-strip {
    gap: 6px;
    max-width: calc(100vw - 24px);
  }

  .status-chip {
    padding: 5px 8px;
    font-size: 11px;
  }
```

In `@media (max-height: 560px)`, add:

```css
  .status-strip {
    gap: 5px;
  }

  .status-chip {
    padding: 4px 7px;
    font-size: 10px;
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

### Task 7: Browser Verification And Tuning

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

- [ ] **Step 2: Verify desktop**

Partial note: desktop layout, status chips, callouts, shield pickup visibility, overflow, and console errors were verified. Browser keyboard automation did not reliably confirm shield pickup collection or shield-save continuation, so those two feel checks remain for manual/real-device play.

Open the local URL and verify:

```text
Viewport: 1280x720
Ready state fits
Playing state shows status chips without covering the player
Close-call callout appears and disappears
Shield pickup is visible on the arena
Shield pickup can be collected
Shield save consumes the shield and keeps the run alive
Game-over still appears when no shield is active
No horizontal or vertical overflow
No runtime console errors
```

- [x] **Step 3: Verify mobile portrait**

Verify:

```text
Viewport: 390x844
Score cards and status chips fit
Callout text does not overlap controls
Shield pickup is visible enough to understand
No horizontal or vertical overflow
```

- [x] **Step 4: Verify mobile landscape**

Verify:

```text
Viewport: 667x375
Status chips do not push the arena out of view
Ready/game-over panels remain usable
Controls remain visible
No horizontal or vertical overflow
```

- [x] **Step 5: Tune if needed**

If the status strip crowds mobile landscape, reduce `.status-chip` padding and font size only inside `@media (max-height: 560px)`.

If shield pickup is hard to see, increase the blue inner blob opacity from `0.82` to `0.95` in `ShieldPickup.tsx`.

If close-call labels fire too often, reduce `closeCallNiceDistance` from `1.35` to `1.2` in `src/game/tuning.ts`.

---

### Task 8: Documentation And Final Verification

**Files:**
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-14-close-call-combo-shield.md`

- [x] **Step 1: Update handoff**

Append this to `docs/handoff.md` notes:

```markdown
- The Close Call Combo and Shield pass adds near-miss rewards, combo bonus scoring, floating doodle callouts, and one-use shield pickups.
- Browser verification should include desktop, mobile portrait, mobile landscape, shield collection, shield save, game-over, and retry.
```

- [x] **Step 2: Create retrospective**

Create `docs/retrospectives/2026-06-14-close-call-combo-shield.md`:

```markdown
# Close Call Combo And Shield Retrospective

## What Changed

- Added close-call detection for near misses.
- Added combo multiplier and bonus scoring.
- Added floating doodle callouts for close calls and shield events.
- Added a single-use shield pickup that can save one collision.
- Updated HUD status chips for combo, shield, and close-call count.

## What Went Well

- Pure helpers made close-call and combo behavior testable without browser automation.
- The feature built on the existing simple loop instead of adding a large economy system.

## What Was Tricky

- Close-call detection needs to feel generous without awarding random far misses.
- Mobile landscape has limited vertical space for extra HUD chips.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- Desktop browser check
- Mobile portrait browser check
- Mobile landscape browser check

## Follow-Up Work

- Add sound effects for close calls and shield saves after user approval.
- Consider daily missions after the core loop feels good.
- Consider character skins only after the game has a stronger repeat-play loop.
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
git commit -m "근접 회피 콤보와 보호막 추가"
git push -u origin feature/close-call-combo-shield
```

If the user asks for commit/push while still on `feature/pure-doodle-redesign`, first confirm whether to keep this work on the same branch or create `feature/close-call-combo-shield`.

---

## Self-Review

- Spec coverage: The plan covers close calls, combo bonus, shield pickup, UI callouts, browser verification, handoff, and retrospective.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `CloseCallTier`, `ComboState`, `ShieldPickup`, and expanded `GameStats` are defined before use.
- Scope check: This is one focused gameplay-feel pass. It does not include sound, economy, skins, ranking, login, or deployment.
