# Multiplayer Room MVP Retrospective

## What Changed

- Added login-free realtime rooms with 4-digit room codes.
- Added temporary nickname entry, create/join flow, lobby, host-only start, countdown, waiting-next-round, and results states.
- Added an in-memory Socket.IO server with pure room state helpers and thin socket handlers.
- Added shared multiplayer types, client socket helpers, and the `useMultiplayerRoom` hook.
- Added deterministic match spawning from `matchSeed` and `spawnIndex`.
- Added remote doodle players, survivor lists, and mobile collapsed survivor list behavior.
- Preserved single-player as a fallback when the multiplayer server is unavailable.

## Verification

- `npm run test -- src/game/logic.test.ts src/ui/MultiplayerPanel.test.tsx src/ui/GameOverlay.test.tsx`
- Desktop browser check with a real host browser client and Socket.IO test clients.
- Local Socket.IO checks for room create/join, lobby sync, countdown, match start, late join, disconnect elimination, results, host transfer, and guest start after host transfer.
- Mobile portrait browser check at `390x844`.
- Mobile landscape browser check at `667x375`.
- Multiplayer server unavailable browser check.
- Browser console re-check after fixing duplicate obstacle keys.

## Decisions

- Kept the first web-open scope login-free and in-memory.
- Used Socket.IO instead of raw WebSocket to keep room events explicit and easier to test.
- Kept collision authority on each client for this MVP and synchronized room state, match seed, start time, player stats, and positions through the server.
- Used small secondary remote doodle figures so multiplayer does not hide hazards or the local player.
- Returned `Leave room` to the first `Single / Multiplayer` screen only after the server acknowledges the leave and the room clears locally.

## Risks

- Room state is not persisted and disappears when the server restarts.
- There is no reconnect grace, login, durable identity, matchmaking, ranking, or anti-cheat.
- Position updates are not yet rate-limited at the socket boundary.
- Browser verification used Socket.IO test clients for extra players because the in-app browser keeps a single tab.
- Real-device mobile multiplayer testing is still needed before public launch.

## Follow-ups

- Add a production deployment plan only after explicit user approval.
- Add inbound socket rate limits before broader testing.
- Consider a reconnect grace window after the first public playtest.
- Add real-device mobile checks for touch control, survivor list expansion, and network latency.
- Decide whether the next polish pass should improve sound, authored art, game-over clarity, or multiplayer lobby UX.
