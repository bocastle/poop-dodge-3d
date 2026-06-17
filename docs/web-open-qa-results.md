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
| Chrome desktop | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Safari desktop | Not run | If skipped, first public opening remains `go with notes`. |
| Mobile portrait `390x844` | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Mobile landscape `667x375` | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Reduced motion | Not run | Keep as deferred unless manually checked before public opening. |

## Multiplayer QA

| Check | Result | Evidence |
| --- | --- | --- |
| Server not configured | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Server stopped | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Create room | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Join room | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Countdown | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Max room size | Not run in this automated-doc task | Run during Task 4 and update this row. |
| Leave room | Not run in this automated-doc task | Run during Task 4 and update this row. |

## Console Errors

- Automated document task did not open a browser.
- Browser console status must be updated during Task 4.

## Release Risks

- No login or durable identity.
- Multiplayer rooms are in memory and vanish on server restart.
- No reconnect grace or anti-cheat.
- Real-device mobile testing is still required before broader promotion.
- Safari desktop is a manual check and may remain `not run` for the first staging pass.

## Public Opening Decision

`go with notes`

The automated checks pass. Browser and multiplayer QA rows must be updated before a public URL is shared beyond staging.
