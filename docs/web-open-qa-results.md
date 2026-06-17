# Web Open QA Results

## Run Summary

- Date: `2026-06-17`
- Verification commit: `dc73a6c`
- Branch: `feature/web-open-release-readiness`
- Scope: release-readiness QA for the first web open candidate
- Result: `go with notes`

## Automated Verification

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint | `npm run lint` | Pass | ESLint completed with exit code 0. |
| Unit tests | `npm run test` | Pass | 19 test files and 161 tests passed. |
| Production build | `npm run build` | Pass | TypeScript build and Vite production build completed. |
| Server typecheck | `npm run server:check` | Pass | Node/server TypeScript project compiled. |

## Browser QA

| Check | Result | Evidence |
| --- | --- | --- |
| Chrome desktop | Pass | Ready screen, single-player start, game-over retry, sound toggle, and console error check passed in the in-app browser at `1280x720`. |
| Safari desktop | Not run | If skipped, first public opening remains `go with notes`. |
| Mobile portrait `390x844` | Pass | Ready screen, multiplayer entry, compact room UI, game-over retry, and overflow checks passed. |
| Mobile landscape `667x375` | Pass | Ready controls and game-over retry are visible after the short-height game-over patch. |
| Reduced motion | Not run | Keep as deferred unless manually checked before public opening. |

## Multiplayer QA

| Check | Result | Evidence |
| --- | --- | --- |
| Server not configured | Pass | `npm run test -- src/multiplayer/useMultiplayerRoom.test.ts` passed with fallback copy coverage. |
| Server stopped | Pass | Browser showed `Could not reach the multiplayer server. Single player still works.` while single-player still started. |
| Create room | Pass | Browser host received a 4-digit room code. |
| Join room | Pass | Socket.IO guest joined the browser host room with the 4-digit room code. |
| Countdown | Pass | Browser host and Socket.IO guest both observed countdown and match start. |
| Max room size | Pass | `npm run test -- server/rooms.test.ts` passed with room capacity coverage. |
| Leave room | Pass | Leaving from multiplayer results returned to the `Single` / `Multiplayer` choice screen. |

## Console Errors

- No fresh runtime console errors were found in desktop, mobile portrait, mobile landscape, multiplayer, or server-stopped browser checks.
- Non-blocking warning observed in Vite dev logs: Three's `Clock` deprecation warning.

## Release-Blocking Fixes During QA

- Mobile landscape `667x375` initially clipped the bottom of the game-over `Retry` button because the game-over panel exceeded the short viewport. The short-height CSS now hides the decorative run highlight on game-over panels, and the same viewport passed with `Retry` fully inside the viewport.

## Release Risks

- No login or durable identity.
- Multiplayer rooms are in memory and vanish on server restart.
- No reconnect grace or anti-cheat.
- Real-device mobile testing is still required before broader promotion.
- Safari desktop is a manual check and may remain `not run` for the first staging pass.

## Public Opening Decision

`go with notes`

Automated checks, browser QA, and local multiplayer QA passed. This remains `go with notes` because Safari desktop and real-device mobile checks are still manual/deferred before broader promotion.
