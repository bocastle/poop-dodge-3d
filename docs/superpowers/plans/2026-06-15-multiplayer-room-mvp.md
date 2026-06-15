# Multiplayer Room MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1차 웹 오픈에 로그인 없는 실시간 멀티플레이 방 기능을 추가해서, 최대 10명이 숫자 4자리 방 코드로 같은 회차의 장애물을 피하고 마지막 생존자를 가릴 수 있게 한다.

**Architecture:** 기존 Vite/React/Three.js 싱글플레이 루프는 유지하고, Socket.IO 기반 Node 서버를 별도 `server/` 디렉터리에 추가한다. 클라이언트와 서버는 `src/multiplayer/`의 타입 계약을 공유하며, 서버는 in-memory room state만 관리한다. 게임 충돌은 각 클라이언트가 로컬에서 판정하고, 서버는 방 상태, 카운트다운, seed, 플레이어 상태, 결과를 동기화한다.

**Tech Stack:** Vite, React, TypeScript, Three.js, React Three Fiber, Socket.IO, Socket.IO Client, Node.js, Vitest, ESLint.

---

## Current Baseline

- Current branch: `feature/pure-doodle-redesign`
- Current working tree: dirty with prior Pure Doodle, close-call, shield, docs, and plan artifacts.
- Current app shape:
  - `src/app/App.tsx` owns `phase`, `runId`, `stats`, keyboard/touch input, high score, and game start/end callbacks.
  - `src/game/GameScene.tsx` owns the local frame loop, player movement, obstacle spawning, collision, shield save, and score updates.
  - `src/ui/GameOverlay.tsx` renders the HUD, ready panel, game-over panel, and callouts.
  - `src/game/logic.ts` already has deterministic `createObstacle(seed, difficulty)`, but `GameScene` currently uses `state.clock.elapsedTime + obstacles.current.length`, so multiplayer needs an explicit `matchSeed + spawnIndex` path.
- Current multiplayer design spec:
  - `docs/superpowers/specs/2026-06-15-multiplayer-room-mvp-design.md`
- Important workflow rule:
  - Do not commit or push unless the user explicitly asks in the current conversation.
  - Commit messages must be Korean when the user explicitly asks for a commit.

## Scope

This plan implements:

- First-screen `Single / Multiplayer` choice.
- Temporary nickname input.
- Create room and join room by numeric 4-digit code.
- Max 10 players.
- Host-only start button.
- Server-synchronized `3 -> 2 -> 1 -> START`.
- Late joiners during countdown/playing become `waitingNextRound`.
- Host transfer to earliest remaining player.
- Disconnect during match marks that player eliminated.
- Same `matchSeed` and `matchStartedAt` for all active players.
- Remote player position rendering as compact colored doodle figures.
- Desktop compact survivor list.
- Mobile collapsed/minimized survivor list.
- Results screen with winner and run metrics.
- Multiplayer server unavailable fallback that keeps single-player working.
- Handoff and retrospective docs after implementation.

This plan excludes:

- Login, accounts, persistent database, public matchmaking, chat, global ranking, cosmetics, friend list, strong anti-cheat, reconnection grace, cooperative mode, and app-store packaging.

## Recommended Branch Flow

Before executing code tasks, use this flow:

1. If the user explicitly asks to commit the existing Pure Doodle work, commit and push that work first with a Korean commit message.
2. If the user does not explicitly ask to commit, keep the current dirty tree and document that multiplayer work is stacked on top of the current branch.
3. Create a feature branch only when the current integration state is clear. Suggested branch name: `feature/multiplayer-room-mvp`.
4. Keep each task small enough to verify independently.
5. Do not merge or push unless the user explicitly asks in the current conversation.

## File Structure

- Create: `src/multiplayer/types.ts`
  - Shared room, player, match, and event payload types.
- Create: `src/multiplayer/roomCode.ts`
  - Pure numeric room code validation and generation helpers.
- Create: `src/multiplayer/roomCode.test.ts`
  - Unit tests for 4-digit validation, collision retry, and failure path.
- Create: `src/multiplayer/roomReducer.ts`
  - Client-side reducer for connection and room UI state.
- Create: `src/multiplayer/roomReducer.test.ts`
  - Unit tests for room state transitions used by the UI.
- Create: `src/multiplayer/socketClient.ts`
  - Socket.IO client factory and event binding helpers.
- Create: `src/multiplayer/useMultiplayerRoom.ts`
  - React hook that exposes room actions and state to `App`.
- Create: `server/rooms.ts`
  - Pure in-memory room state machine.
- Create: `server/rooms.test.ts`
  - Unit tests for room creation, join, host transfer, countdown, late join, elimination, winner, and cleanup.
- Create: `server/index.ts`
  - Node HTTP + Socket.IO server entrypoint.
- Create: `server/socketHandlers.ts`
  - Socket.IO event handlers that call `server/rooms.ts`.
- Create: `src/ui/MultiplayerPanel.tsx`
  - Entry, nickname, create/join, lobby, connection error, and results UI.
- Create: `src/ui/SurvivorList.tsx`
  - Desktop compact and mobile collapsed survivor list.
- Create: `src/game/visuals/RemoteDoodlePlayer.tsx`
  - Small colored doodle avatar for remote players.
- Modify: `package.json`
  - Add Socket.IO dependencies and server scripts.
- Modify: `package-lock.json`
  - Update through `npm install`.
- Modify: `tsconfig.node.json`
  - Include `server/**/*.ts` and shared multiplayer types.
- Modify: `eslint.config.js`
  - Add Node globals override for server files.
- Modify: `.gitignore`
  - Ignore local multiplayer env files if not already covered.
- Create: `.env.example`
  - Document `VITE_MULTIPLAYER_SERVER_URL`.
- Modify: `src/app/App.tsx`
  - Add app mode selection and connect multiplayer hook to game lifecycle.
- Modify: `src/game/types.ts`
  - Add multiplayer match/player snapshot types only if they are game-loop-specific.
- Modify: `src/game/logic.ts`
  - Add explicit seeded obstacle helper that accepts `matchSeed` and `spawnIndex`.
- Modify: `src/game/logic.test.ts`
  - Test deterministic seeded obstacle generation.
- Modify: `src/game/GameScene.tsx`
  - Accept match seed, remote players, countdown lock, local snapshot callback, and multiplayer elimination callback.
- Modify: `src/ui/GameOverlay.tsx`
  - Render single-player panels and delegate multiplayer panels without covering the arena during match.
- Modify: `src/styles.css`
  - Add responsive multiplayer UI, survivor list, remote player labels, and mobile collapsed state.
- Modify: `docs/handoff.md`
  - Update project state, new commands, verification, and known risks.
- Create: `docs/retrospectives/2026-06-15-multiplayer-room-mvp.md`
  - Record implementation decisions, verification, and follow-up work.

---

### Task 0: Baseline And Dependency Safety

**Files:**
- Read: `AGENTS.md`
- Read: `docs/superpowers/specs/2026-06-15-multiplayer-room-mvp-design.md`
- Read: `package.json`
- Read: `src/app/App.tsx`
- Read: `src/game/GameScene.tsx`
- Read: `src/ui/GameOverlay.tsx`
- No source edits.

- [ ] **Step 1: Confirm the current branch and dirty tree**

Run:

```bash
git status --short --branch
```

Expected branch for the current stacked work:

```text
## feature/pure-doodle-redesign
```

If the user explicitly asks for a clean feature branch before implementation, create `feature/multiplayer-room-mvp` from the approved base. If not, keep work on the current branch and update `docs/handoff.md` with the stacked-feature note.

- [ ] **Step 2: Run baseline checks before adding multiplayer**

Run:

```bash
npm run lint
npm run test
npm run build
```

Expected:

```text
eslint exits 0
Vitest exits 0
Vite build exits 0
```

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

- [ ] **Step 3: Install realtime dependencies**

Run:

```bash
npm install socket.io socket.io-client tsx
```

Expected changes:

```text
package.json
package-lock.json
```

`tsx` is installed as a runtime dependency for the first web-open server because Render/Fly production installs can omit dev dependencies depending on configuration.

- [ ] **Step 4: Add package scripts**

Modify `package.json` scripts:

```json
{
  "dev": "vite",
  "server:dev": "tsx watch server/index.ts",
  "server:start": "tsx server/index.ts",
  "server:check": "tsc -p tsconfig.node.json",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host 127.0.0.1",
  "lint": "eslint .",
  "test": "vitest run"
}
```

---

### Task 1: Shared Multiplayer Contract

**Files:**
- Create: `src/multiplayer/types.ts`
- Create: `src/multiplayer/roomCode.ts`
- Create: `src/multiplayer/roomCode.test.ts`
- Create: `src/multiplayer/roomReducer.ts`
- Create: `src/multiplayer/roomReducer.test.ts`

- [ ] **Step 1: Define shared room and event types**

Create `src/multiplayer/types.ts`:

```ts
import type { Position } from "../game/types";

export const MAX_ROOM_PLAYERS = 10;
export const ROOM_CODE_LENGTH = 4;
export const COUNTDOWN_SECONDS = 3;

export type RoomStatus = "lobby" | "countdown" | "playing" | "results";

export type MultiplayerPlayerState =
  | "lobby"
  | "countdown"
  | "alive"
  | "eliminated"
  | "waitingNextRound"
  | "disconnected";

export type MultiplayerPlayer = {
  id: string;
  nickname: string;
  color: string;
  joinedAt: number;
  state: MultiplayerPlayerState;
  position: Position;
  score: number;
  elapsedSeconds: number;
  closeCalls: number;
  shieldSaves: number;
};

export type MultiplayerRoom = {
  roomCode: string;
  hostId: string;
  players: MultiplayerPlayer[];
  status: RoomStatus;
  seed: number | null;
  countdownStartedAt: number | null;
  matchStartedAt: number | null;
  roundId: number;
  winnerId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateRoomRequest = {
  nickname: string;
};

export type JoinRoomRequest = {
  roomCode: string;
  nickname: string;
};

export type PlayerPositionPayload = {
  roomCode: string;
  position: Position;
};

export type PlayerStatsPayload = {
  roomCode: string;
  score: number;
  elapsedSeconds: number;
  closeCalls: number;
  shieldSaves: number;
};

export type PlayerEliminatedPayload = PlayerStatsPayload;

export type RoomErrorCode =
  | "invalid_nickname"
  | "invalid_room_code"
  | "room_not_found"
  | "room_full"
  | "not_host"
  | "room_not_ready"
  | "server_error";

export type RoomErrorPayload = {
  code: RoomErrorCode;
  message: string;
};
```

- [ ] **Step 2: Add pure room code helpers**

Create `src/multiplayer/roomCode.ts`:

```ts
import { ROOM_CODE_LENGTH } from "./types";

const codePattern = new RegExp(`^\\d{${ROOM_CODE_LENGTH}}$`);

export function isValidRoomCode(value: string) {
  return codePattern.test(value);
}

export function normalizeRoomCode(value: string) {
  return value.replace(/\D/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function createRoomCode(existingCodes: ReadonlySet<string>, random = Math.random) {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const code = Math.floor(random() * 10000).toString().padStart(ROOM_CODE_LENGTH, "0");
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  return null;
}
```

- [ ] **Step 3: Test room code behavior**

Create `src/multiplayer/roomCode.test.ts` with tests for:

```text
validates exactly four digits
normalizes non-digit input to four digits
creates a padded numeric code
retries when a generated code already exists
returns null after repeated collisions
```

- [ ] **Step 4: Add client room reducer**

Create `src/multiplayer/roomReducer.ts` with a small reducer that owns UI-facing state:

```ts
import type { MultiplayerRoom, RoomErrorPayload } from "./types";

export type MultiplayerView =
  | "entry"
  | "nickname"
  | "createOrJoin"
  | "lobby"
  | "countdown"
  | "playing"
  | "results";

export type MultiplayerClientState = {
  view: MultiplayerView;
  nickname: string;
  room: MultiplayerRoom | null;
  connected: boolean;
  connecting: boolean;
  error: RoomErrorPayload | null;
  survivorListOpen: boolean;
};

export type MultiplayerClientAction =
  | { type: "setNickname"; nickname: string }
  | { type: "connectStart" }
  | { type: "connectSuccess" }
  | { type: "connectFailed"; error: RoomErrorPayload }
  | { type: "roomState"; room: MultiplayerRoom }
  | { type: "setError"; error: RoomErrorPayload | null }
  | { type: "setView"; view: MultiplayerView }
  | { type: "toggleSurvivorList" }
  | { type: "reset" };
```

Reducer rules:

```text
room.status lobby -> view lobby
room.status countdown -> view countdown
room.status playing -> view playing
room.status results -> view results
connectFailed keeps room null and lets single-player continue
toggleSurvivorList only flips the boolean, it does not change room data
```

- [ ] **Step 5: Test reducer transitions**

Create `src/multiplayer/roomReducer.test.ts` with tests for:

```text
connect failure stores a visible error
room lobby selects lobby view
room countdown selects countdown view
room playing selects playing view
room results selects results view
survivor list toggle is independent from room state
reset returns to entry state
```

---

### Task 2: Server Room State Machine

**Files:**
- Create: `server/rooms.ts`
- Create: `server/rooms.test.ts`
- Modify: `tsconfig.node.json`
- Modify: `eslint.config.js`

- [ ] **Step 1: Include server files in TypeScript checking**

Modify `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "eslint.config.js", "server/**/*.ts", "src/multiplayer/**/*.ts", "src/game/types.ts"]
}
```

- [ ] **Step 2: Add Node globals lint override**

Modify `eslint.config.js` by adding a server override after the browser TypeScript block:

```ts
{
  files: ["server/**/*.ts"],
  languageOptions: {
    ecmaVersion: 2023,
    globals: globals.node,
  },
}
```

- [ ] **Step 3: Implement pure server room store**

Create `server/rooms.ts` with these exports:

```ts
import {
  COUNTDOWN_SECONDS,
  MAX_ROOM_PLAYERS,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type MultiplayerPlayer,
  type MultiplayerRoom,
  type PlayerEliminatedPayload,
  type PlayerPositionPayload,
  type PlayerStatsPayload,
  type RoomErrorPayload,
} from "../src/multiplayer/types";
import { createRoomCode, isValidRoomCode } from "../src/multiplayer/roomCode";

export type RoomStore = {
  rooms: Map<string, MultiplayerRoom>;
  socketToRoom: Map<string, string>;
};

export type RoomStoreResult =
  | { ok: true; room: MultiplayerRoom; player: MultiplayerPlayer }
  | { ok: false; error: RoomErrorPayload };

export function createRoomStore(): RoomStore {
  return {
    rooms: new Map(),
    socketToRoom: new Map(),
  };
}
```

Implement these pure functions in the same file:

```text
createRoom(store, socketId, request, now)
joinRoom(store, socketId, request, now)
leaveRoom(store, socketId, now)
startCountdown(store, roomCode, socketId, now, seed)
startMatchIfReady(store, roomCode, now)
updatePlayerPosition(store, socketId, payload, now)
updatePlayerStats(store, socketId, payload, now)
eliminatePlayer(store, socketId, payload, now)
cleanupIdleRooms(store, now)
getRoomBySocket(store, socketId)
```

Rules:

```text
Nickname is trimmed to 12 visible characters.
Empty nickname returns invalid_nickname.
Room code must be exactly four digits.
Room max active players is 10.
Players joining during lobby enter lobby state.
Players joining during countdown, playing, or results enter waitingNextRound state.
Host is the earliest joined non-disconnected player.
If host leaves, hostId changes to the earliest remaining non-disconnected player.
If no players remain, room is deleted.
startCountdown only succeeds for host while room.status is lobby or results.
startCountdown sets status countdown, seed, countdownStartedAt, matchStartedAt, winnerId null, and increments roundId.
startMatchIfReady changes countdown players to alive when now >= matchStartedAt.
eliminatePlayer changes alive player to eliminated and updates final stats.
When one alive player remains, room status becomes results and winnerId becomes that player id.
When zero alive players remain, room status becomes results and winnerId remains null.
```

- [ ] **Step 4: Test room store rules**

Create `server/rooms.test.ts` with tests for:

```text
creates a room with a 4-digit code and host player
rejects empty nickname
rejects invalid room code
allows players to join lobby until 10 players
rejects the 11th player with room_full
assigns waitingNextRound for countdown joins
assigns waitingNextRound for playing joins
transfers host to earliest remaining player on host leave
deletes room when the last player leaves
marks playing disconnect as eliminated
starts countdown only for host
moves countdown players to alive at match start time
announces winner when one alive player remains
announces no winner when every alive player is eliminated
cleans idle empty rooms
```

Run after this task:

```bash
npm run test -- server/rooms.test.ts src/multiplayer/roomCode.test.ts src/multiplayer/roomReducer.test.ts
npm run server:check
```

---

### Task 3: Socket.IO Server Wiring

**Files:**
- Create: `server/index.ts`
- Create: `server/socketHandlers.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add environment example**

Create `.env.example`:

```text
VITE_MULTIPLAYER_SERVER_URL=http://localhost:5174
PORT=5174
```

- [ ] **Step 2: Create server entrypoint**

Create `server/index.ts`:

```ts
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createRoomStore } from "./rooms";
import { registerSocketHandlers } from "./socketHandlers";

const port = process.env.PORT ? Number(process.env.PORT) : 5174;
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
  },
});
const store = createRoomStore();

registerSocketHandlers(io, store);

httpServer.listen(port, () => {
  console.log(`multiplayer server listening on ${port}`);
});
```

- [ ] **Step 3: Register socket events**

Create `server/socketHandlers.ts` with handlers for:

```text
connection
room:create
room:join
room:leave
room:start
player:position
player:stats
player:eliminated
disconnect
```

Event behavior:

```text
On create/join success, socket joins roomCode and server emits room:state to the room.
On errors, server emits room:error only to the requesting socket.
On room:start success, server emits match:countdown and room:state.
During countdown, server schedules a timer for matchStartedAt and emits match:start plus room:state.
On position update, server broadcasts player:position to other sockets in the room.
On stats update, server emits room:state at a throttled cadence no faster than 5 times per second per room.
On eliminated or playing disconnect, server updates room and emits room:state.
On room result, server emits match:end and room:state.
```

Use Socket.IO room broadcasting:

```ts
io.to(room.roomCode).emit("room:state", room);
socket.to(room.roomCode).emit("player:position", {
  playerId: socket.id,
  position: payload.position,
});
```

- [ ] **Step 4: Verify server can start**

Run:

```bash
npm run server:check
npm run server:start
```

Expected:

```text
multiplayer server listening on 5174
```

Stop the server after verifying the log.

---

### Task 4: Frontend Socket Client Hook

**Files:**
- Create: `src/multiplayer/socketClient.ts`
- Create: `src/multiplayer/useMultiplayerRoom.ts`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Create Socket.IO client helper**

Create `src/multiplayer/socketClient.ts`:

```ts
import { io, type Socket } from "socket.io-client";

export function getMultiplayerServerUrl() {
  return import.meta.env.VITE_MULTIPLAYER_SERVER_URL as string | undefined;
}

export function createMultiplayerSocket(serverUrl: string): Socket {
  return io(serverUrl, {
    autoConnect: false,
    transports: ["websocket"],
  });
}
```

- [ ] **Step 2: Create multiplayer hook**

Create `src/multiplayer/useMultiplayerRoom.ts` with:

```text
state from multiplayerReducer
socket ref
connect()
setNickname(nickname)
createRoom()
joinRoom(roomCode)
leaveRoom()
startRoom()
sendPosition(position)
sendStats(stats)
sendEliminated(stats)
reset()
```

Hook behavior:

```text
If VITE_MULTIPLAYER_SERVER_URL is missing, connectFailed sets room:error with server_error.
Connection failure never changes single-player state.
room:state dispatches roomState.
room:error dispatches setError.
match:countdown and match:start are represented through room.status and timestamps from room:state.
player:position updates remote player cache without requiring a full room:state.
Socket disconnect while in multiplayer shows a visible error.
Hook cleanup disconnects socket on unmount.
```

- [ ] **Step 3: Add app-level mode state**

Modify `src/app/App.tsx`:

```ts
type AppMode = "single" | "multiplayer";

const [mode, setMode] = useState<AppMode>("single");
const multiplayer = useMultiplayerRoom();
```

Rules:

```text
Single-player start remains available without a socket.
Choosing Multiplayer opens the multiplayer entry UI.
Leaving a multiplayer room returns to the first Single / Multiplayer choice.
```

Run after this task:

```bash
npm run lint
npm run test -- src/multiplayer
```

---

### Task 5: Multiplayer Entry, Lobby, Countdown, And Results UI

**Files:**
- Create: `src/ui/MultiplayerPanel.tsx`
- Create: `src/ui/SurvivorList.tsx`
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add first-screen mode selection**

Modify `GameOverlay` props:

```ts
type GameOverlayProps = {
  phase: GamePhase;
  stats: GameStats;
  touchActive: boolean;
  mode: "single" | "multiplayer";
  multiplayer: MultiplayerOverlayState;
  onSelectSingle: () => void;
  onSelectMultiplayer: () => void;
  onStart: () => void;
};
```

Ready panel behavior:

```text
Show Poop Dodge 3D title.
Show two primary actions: Single, Multiplayer.
Single starts current single-player flow.
Multiplayer opens the multiplayer panel.
Do not show a marketing landing page.
```

- [ ] **Step 2: Add multiplayer panel views**

Create `src/ui/MultiplayerPanel.tsx` with these UI states:

```text
nickname input
create or join selection
room code input
lobby player list
host start button
countdown panel
results panel
server unavailable fallback message
leave room button
```

Copy rules:

```text
Use short labels.
Use "방 만들기", "방 입장", "시작", "나가기" for Korean UI labels only if the rest of the current screen is converted together.
If the current game UI remains English, use "Create room", "Join room", "Start", "Leave" to avoid mixed tone.
```

For this pass, keep visible game UI English because the current app UI is English.

- [ ] **Step 3: Add survivor list component**

Create `src/ui/SurvivorList.tsx`:

```text
Desktop: compact corner list with nickname, state, score.
Mobile: collapsed chip by default, tap opens a small panel.
Alive players sort before eliminated players.
Host marker is small and text-safe.
At 10 players, names truncate without layout overflow.
```

- [ ] **Step 4: Add responsive CSS**

Modify `src/styles.css`:

```text
.mode-actions
.multiplayer-panel
.room-code
.player-list
.player-row
.survivor-list
.survivor-list-toggle
.countdown-card
.match-result-list
```

Mobile requirements:

```text
No full-height right sidebar on mobile.
Survivor list defaults collapsed below 700px width.
Buttons keep stable height.
Long nicknames truncate.
No text overlaps the canvas controls footer.
```

Run after this task:

```bash
npm run lint
npm run test
```

---

### Task 6: Deterministic Match Seed And Game Loop Adapter

**Files:**
- Modify: `src/game/logic.ts`
- Modify: `src/game/logic.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/GameScene.tsx`

- [ ] **Step 1: Add explicit seeded obstacle helper**

Modify `src/game/logic.ts`:

```ts
export function createSeededObstacle(matchSeed: number, spawnIndex: number, difficulty: Difficulty) {
  return createObstacle(matchSeed + spawnIndex * 0.9973, difficulty);
}
```

- [ ] **Step 2: Test deterministic obstacle generation**

Modify `src/game/logic.test.ts` with tests for:

```text
same matchSeed and spawnIndex produce identical obstacle
different spawnIndex changes obstacle id or position
different matchSeed changes obstacle id or position
```

- [ ] **Step 3: Extend GameScene props**

Modify `src/game/GameScene.tsx` props:

```ts
type RemotePlayerSnapshot = {
  id: string;
  nickname: string;
  color: string;
  position: Position;
  state: "alive" | "eliminated" | "waitingNextRound" | "disconnected";
};

type MultiplayerMatchConfig = {
  enabled: boolean;
  matchSeed: number | null;
  matchStartedAt: number | null;
  serverNowOffsetMs: number;
  localPlayerId: string | null;
  remotePlayers: RemotePlayerSnapshot[];
};

type GameSceneProps = {
  input: InputVector;
  phase: GamePhase;
  runId: number;
  multiplayerMatch?: MultiplayerMatchConfig;
  onLocalSnapshot?: (position: Position, stats: GameStats) => void;
  onMultiplayerEliminated?: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void;
  onStatsChange: (stats: GameStats) => void;
};
```

- [ ] **Step 4: Use spawn index instead of elapsed clock for multiplayer**

Add refs:

```ts
const spawnIndex = useRef(0);
const runSeed =
  multiplayerMatch?.matchSeed !== null && multiplayerMatch?.matchSeed !== undefined
    ? multiplayerMatch.matchSeed
    : runId;
```

Reset `spawnIndex.current = 0` in the `runId` effect.

Obstacle spawn rule:

```ts
const nextObstacle = multiplayerMatch?.enabled && multiplayerMatch.matchSeed !== null
  ? createSeededObstacle(multiplayerMatch.matchSeed, spawnIndex.current, difficulty)
  : createObstacle(runSeed + spawnIndex.current * 0.9973, difficulty);
spawnIndex.current += 1;
obstacles.current.push(nextObstacle);
```

- [ ] **Step 5: Lock gameplay until multiplayer match start**

When `multiplayerMatch.enabled` is true:

```text
If matchStartedAt is null, animate idle state and skip movement/collision.
If Date.now() + serverNowOffsetMs < matchStartedAt, animate idle state and skip movement/collision.
When match start time arrives, allow movement and collision.
```

- [ ] **Step 6: Send throttled local snapshots**

In `GameScene`, call `onLocalSnapshot` no faster than 10 times per second while multiplayer is playing:

```text
position
score
elapsedSeconds
closeCalls
shieldSaves
```

On unshielded collision in multiplayer:

```text
call onMultiplayerEliminated(nextStats)
then call onGameOver(nextStats)
```

Run after this task:

```bash
npm run test -- src/game/logic.test.ts
npm run lint
```

---

### Task 7: Remote Player Rendering

**Files:**
- Create: `src/game/visuals/RemoteDoodlePlayer.tsx`
- Modify: `src/game/GameScene.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add remote doodle visual**

Create `src/game/visuals/RemoteDoodlePlayer.tsx`:

```ts
import { useMemo } from "react";
import type { Position } from "../types";

type RemoteDoodlePlayerProps = {
  color: string;
  position: Position;
  eliminated: boolean;
};

export function RemoteDoodlePlayer({ color, position, eliminated }: RemoteDoodlePlayerProps) {
  const opacity = eliminated ? 0.28 : 0.72;
  const materialColor = useMemo(() => color, [color]);

  return (
    <group position={[position.x, position.y + 0.04, position.z]} scale={0.72}>
      <mesh>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color={materialColor} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color={materialColor} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}
```

Keep the remote shape smaller than the local `DoodlePlayer`.

- [ ] **Step 2: Render remote players in GameScene**

In `GameScene`, render remote players after `DoodlePlayer` and before hazards:

```tsx
{multiplayerMatch?.remotePlayers.map((player) => (
  <RemoteDoodlePlayer
    key={player.id}
    color={player.color}
    position={player.position}
    eliminated={player.state !== "alive"}
  />
))}
```

- [ ] **Step 3: Keep remote players visually secondary**

Rules:

```text
Do not render full-size labels inside the 3D scene.
Use DOM survivor list for names and scores.
Remote player opacity drops when eliminated.
Remote player mesh cannot hide falling hazards or local player.
```

Run after this task:

```bash
npm run lint
npm run build
```

---

### Task 8: Multiplayer App Integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/ui/GameOverlay.tsx`
- Modify: `src/multiplayer/useMultiplayerRoom.ts`

- [ ] **Step 1: Start multiplayer match from server state**

In `App.tsx`, when the current multiplayer room status changes:

```text
room.status lobby -> phase ready
room.status countdown -> phase ready and show countdown overlay
room.status playing -> reset stats, increment runId, phase playing
room.status results -> phase game-over or multiplayer results panel
```

Avoid restarting the local game repeatedly:

```text
Track lastStartedRoundId in a ref.
Only increment runId when room.roundId changes and status becomes playing.
```

- [ ] **Step 2: Wire player snapshot and elimination**

Pass to `GameScene`:

```text
multiplayerMatch.enabled
multiplayerMatch.matchSeed
multiplayerMatch.matchStartedAt
multiplayerMatch.remotePlayers
onLocalSnapshot -> multiplayer.sendPosition + multiplayer.sendStats
onMultiplayerEliminated -> multiplayer.sendEliminated
```

- [ ] **Step 3: Preserve single-player high score behavior**

Rules:

```text
Single-player game-over still writes local high score.
Multiplayer game-over does not overwrite single-player high score unless the user later asks for shared scoring.
Scorebar can still show current score in multiplayer.
```

- [ ] **Step 4: Late join behavior**

If the local player state is `waitingNextRound`:

```text
Do not start local collision gameplay.
Show room match view with survivor list and waiting message.
Allow leaving the room.
Join next round when host starts again.
```

Run after this task:

```bash
npm run lint
npm run test
npm run build
```

---

### Task 9: Local Browser Verification With Two Clients

**Files:**
- No source edits unless verification finds a bug.

- [ ] **Step 1: Start the Socket.IO server**

Run in one terminal:

```bash
npm run server:dev
```

Expected:

```text
multiplayer server listening on 5174
```

- [ ] **Step 2: Start Vite**

Run in another terminal:

```bash
npm run dev -- --host 127.0.0.1
```

Expected:

```text
Local: http://127.0.0.1:5173/
```

- [ ] **Step 3: Verify desktop two-tab flow**

Use the in-app browser and a second browser context or tab:

```text
Open tab A at http://127.0.0.1:5173/
Select Multiplayer
Enter nickname Host
Create room
Copy 4-digit room code
Open tab B at http://127.0.0.1:5173/
Select Multiplayer
Enter nickname Guest
Join by code
Confirm both players appear in lobby
Click Start as Host
Confirm both tabs show 3 -> 2 -> 1 -> START
Move both players
Confirm remote player positions update
Confirm one player elimination updates survivor list
Confirm winner/results show when one player remains
```

- [ ] **Step 4: Verify late join**

During a playing match:

```text
Open tab C
Join same room code
Confirm tab C state is waitingNextRound
Confirm tab C is not spawned as alive during current round
Finish current round
Start next round as host
Confirm tab C becomes active
```

- [ ] **Step 5: Verify host transfer**

In lobby:

```text
Host creates room
Guest joins
Host leaves or disconnects
Confirm Guest becomes host
Confirm Guest can start countdown
```

- [ ] **Step 6: Verify mobile layouts**

Use browser viewport sizes:

```text
390x844 mobile portrait
667x375 mobile landscape
```

Confirm:

```text
Entry panel fits without clipped buttons
Lobby player list supports 10 names without overflow
Countdown is readable
Survivor list defaults collapsed or minimized
Expanded survivor list does not cover core player/hazard area
Controls footer does not overlap multiplayer actions
```

- [ ] **Step 7: Verify server unavailable fallback**

Stop the Socket.IO server and keep Vite running.

Confirm:

```text
Single-player can start and finish.
Multiplayer shows a clear unavailable message.
The UI offers a path back to Single.
No uncaught browser console errors appear.
```

---

### Task 10: Documentation And Retrospective

**Files:**
- Modify: `docs/handoff.md`
- Create: `docs/retrospectives/2026-06-15-multiplayer-room-mvp.md`

- [ ] **Step 1: Update handoff in English**

Modify `docs/handoff.md` with:

```text
Current branch and stacked-work status
Multiplayer feature status
New dependencies
New scripts
Server env vars
Verification performed
Known risks
Next recommended work
```

Mention:

```text
Socket server is in-memory.
Frontend requires VITE_MULTIPLAYER_SERVER_URL for multiplayer.
Single-player works without multiplayer server.
Deployment is not performed until the user explicitly approves.
```

- [ ] **Step 2: Add retrospective in English**

Create `docs/retrospectives/2026-06-15-multiplayer-room-mvp.md` with:

```text
# Multiplayer Room MVP Retrospective

## What Changed

## Verification

## Decisions

## Risks

## Follow-ups
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run lint
npm run test
npm run server:check
npm run build
git diff --check
```

Expected:

```text
eslint exits 0
Vitest exits 0
TypeScript server check exits 0
Vite build exits 0
git diff --check exits 0
```

Known acceptable warning:

```text
Some chunks are larger than 500 kB after minification
```

---

## Acceptance Criteria

- [ ] First screen offers Single and Multiplayer.
- [ ] Single-player works without a realtime server.
- [ ] Multiplayer shows a clear unavailable state if `VITE_MULTIPLAYER_SERVER_URL` is missing or unreachable.
- [ ] User can create a room and receive a 4-digit numeric code.
- [ ] Another user can join with that code.
- [ ] Room enforces max 10 players.
- [ ] Only host can start the round.
- [ ] All active players see synchronized `3 -> 2 -> 1 -> START`.
- [ ] All active players use the same `matchSeed` and `matchStartedAt`.
- [ ] Remote players render as small secondary doodle figures.
- [ ] Survivor list is compact on desktop.
- [ ] Survivor list is collapsed or minimized by default on mobile.
- [ ] Joining during countdown or playing sets the player to `waitingNextRound`.
- [ ] Host disconnect transfers host to the earliest remaining player.
- [ ] Playing disconnect marks the player eliminated.
- [ ] Server announces winner when one alive player remains.
- [ ] Results show winner and player metrics.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run server:check` passes.
- [ ] `npm run build` passes.
- [ ] Browser verification covers desktop, mobile portrait, and mobile landscape.

## Risk Controls

- Keep server state pure in `server/rooms.ts` so the hard game rules are testable without sockets.
- Keep Socket.IO handlers thin so network bugs do not hide state-machine bugs.
- Keep remote players visually secondary so multiplayer does not damage the current game readability.
- Keep single-player independent from the socket hook so server failures do not break the first web-open fallback.
- Use explicit `matchSeed` and `spawnIndex` to keep obstacle generation deterministic across clients.
- Do not add database or login work in this pass.
- Do not deploy until the user explicitly approves deployment work.
