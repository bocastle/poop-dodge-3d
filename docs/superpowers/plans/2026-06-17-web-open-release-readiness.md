# Web Open Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the already-merged web MVP for a safe first public web opening by updating release-state docs, recording QA evidence, and documenting deployment readiness without deploying.

**Architecture:** This is a documentation-first release-readiness pass. It does not change game runtime behavior; it updates handoff state, adds one deployment-readiness document, adds one QA-results document, and records verification evidence. Any release-blocking issue found during QA must be handled as a small scoped patch in this same feature branch.

**Tech Stack:** Vite, React, TypeScript, React Three Fiber, Socket.IO, Vitest, ESLint, Markdown docs.

---

## File Structure

- Modify `docs/handoff.md`: current branch/status, next steps, and notes must reflect that the MVP has been merged through `main` and is now a web-open candidate.
- Create `docs/deployment-readiness.md`: deployment options, required environment variables, CORS rules, Socket.IO checks, and staging/production separation.
- Create `docs/web-open-qa-results.md`: actual QA run evidence for the release-readiness pass, including automated verification and browser/multiplayer checks.
- Create `docs/retrospectives/2026-06-17-web-open-release-readiness.md`: English retrospective after the pass is complete.
- Modify `docs/superpowers/specs/2026-06-17-web-open-release-readiness-design.md`: only if execution reveals a spec contradiction that must be corrected.
- Modify `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`: update checkbox status while executing.

## Branch And Commit Rules

- Work from `feature/web-open-release-readiness`.
- Do not work directly on `main`.
- Use Korean commit messages.
- Commit after each major task only when the current conversation explicitly authorizes commit/push work.
- Do not push unless the user explicitly asks for push in the current conversation.

## Task 1: Release State Handoff Cleanup

**Files:**
- Modify: `docs/handoff.md`
- Modify: `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`

- [x] **Step 1: Confirm branch and stale handoff text**

Run:

```bash
git status --short --branch
rg -n "feature/pure-doodle-redesign|pending final user review|pending final user review, commit, push, and integration|Decide later whether `main` should receive" docs/handoff.md
```

Expected:

```text
## feature/web-open-release-readiness
```

Expected `rg`: at least one stale line is found before editing.

- [x] **Step 2: Update the Current State section**

In `docs/handoff.md`, replace the whole `## Current State` bullet block with this content:

```markdown
## Current State

- Repository: `poop-dodge-3d`
- Current working branch: `feature/web-open-release-readiness`
- Integration branch: `develop`
- Release branch: `main`
- Remote: `https://github.com/bocastle/poop-dodge-3d.git`
- Project status: web MVP is merged to `main` and is now a first web-open candidate. The C1 Pure Doodle redesign, Close Call Combo/Shield pass, Game Feel Shield Impact pass, Multiplayer Room MVP, Fun Feedback pass, One More Run Loop pass, Web Open Readiness pass, and Web Open Stability QA pass are included in `main`.
- Deployment status: not deployed. The current goal is release-readiness documentation, QA evidence, and staging deployment preparation before any public URL is opened.
```

- [x] **Step 3: Update Next Steps**

Replace the whole `## Next Steps` numbered list with:

```markdown
## Next Steps

1. Complete the Web Open Release Readiness pass on `feature/web-open-release-readiness`.
2. Record automated and browser QA results in `docs/web-open-qa-results.md`.
3. Document deployment options and environment requirements in `docs/deployment-readiness.md`.
4. Fix only release-blocking issues discovered during QA; defer feature requests to later specs.
5. After user approval, merge through `develop` into `main`.
6. After a separate deployment approval, create a staging deployment and verify the public URL path.
```

- [x] **Step 4: Add a release-readiness note**

In the `## Notes` section, add this bullet near the top:

```markdown
- The Web Open Release Readiness pass is documentation-first: it updates release state, records QA evidence, and prepares deployment criteria. It does not deploy the app unless the user separately approves deployment.
```

- [x] **Step 5: Verify stale text is removed**

Run:

```bash
rg -n "feature/pure-doodle-redesign|pending final user review|pending final user review, commit, push, and integration|Decide later whether `main` should receive" docs/handoff.md
```

Expected: no output and exit code `1`.

- [x] **Step 6: Review the handoff diff**

Run:

```bash
git diff -- docs/handoff.md
```

Expected: only release-state, next-step, and release-readiness note changes appear.

- [x] **Step 7: Commit the handoff cleanup**

Run:

```bash
git add docs/handoff.md docs/superpowers/plans/2026-06-17-web-open-release-readiness.md
git commit -m "웹 오픈 릴리즈 상태 정리"
```

Expected: commit succeeds.

## Task 2: Deployment Readiness Document

**Files:**
- Create: `docs/deployment-readiness.md`
- Modify: `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`

- [x] **Step 1: Confirm the document does not exist yet**

Run:

```bash
test ! -f docs/deployment-readiness.md
```

Expected: exit code `0`.

- [x] **Step 2: Create `docs/deployment-readiness.md`**

Create the file with this content:

```markdown
# Deployment Readiness

## Scope

This document prepares the first web opening for `poop-dodge-3d`. It does not approve or perform deployment. A separate user approval is required before creating a staging or production URL.

## Current Release Candidate

- Release branch: `main`
- Working release-readiness branch: `feature/web-open-release-readiness`
- App type: browser-first Vite/React/React Three Fiber game
- Multiplayer type: Socket.IO server with in-memory rooms
- Public opening target: web first

## Frontend Hosting Candidates

| Candidate | Fit | Notes |
| --- | --- | --- |
| Vercel | Strong fit | Good Vite support, simple environment variables, preview URLs. |
| Netlify | Strong fit | Good static hosting flow, simple preview deploys. |

## Multiplayer Server Hosting Candidates

| Candidate | Fit | Notes |
| --- | --- | --- |
| Render | Good first choice | Simple Node service deploys. Check cold start and WebSocket behavior on the selected plan. |
| Fly.io | Good technical fit | Strong region control and long-running services. More operational setup than Render. |
| Railway | Good prototype fit | Fast setup. Confirm plan limits before public traffic. |

## Required Environment Variables

### Frontend

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_MULTIPLAYER_SERVER_URL` | `https://poop-dodge-3d-server.example.com` | Socket.IO server URL used by the browser client. |

### Multiplayer Server

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `5174` | HTTP and Socket.IO listen port. The hosting provider may inject this automatically. |
| `CLIENT_ORIGIN` | `https://poop-dodge-3d.example.com` | Allowed browser origin for Socket.IO CORS. |

## Environment Separation

Use separate values for local, staging, and production.

| Environment | Frontend Origin | Server Origin | Notes |
| --- | --- | --- | --- |
| Local | `http://127.0.0.1:5173` | `http://127.0.0.1:5174` | Used for local dev and QA. |
| Staging | provider preview URL | staging server URL | Used before public opening. |
| Production | final public URL | production server URL | Used only after user approval. |

## CORS Rules

- `CLIENT_ORIGIN` must match the exact frontend origin.
- Staging and production must not share the same server environment unless that is explicitly approved.
- If the frontend origin changes, update `CLIENT_ORIGIN` before testing multiplayer.
- Single-player must remain playable when the multiplayer server is unavailable.

## Socket.IO Release Checks

- Create room returns a 4-digit room code.
- Join room accepts a valid 4-digit room code.
- The host can start a synchronized `3 -> 2 -> 1 -> START` countdown.
- Late joiners during an active round wait for the next round.
- Leaving a room returns to the single/multiplayer choice screen.
- Stopping the server produces a clear multiplayer error while preserving single-player.
- The 11th player is rejected because rooms are capped at 10 players.

## Deployment Go/No-Go Criteria

### Go

- Automated verification passes.
- Browser QA has no release-blocking console errors.
- Single-player works without the multiplayer server.
- Multiplayer room create/join/countdown path works in staging.

### Go With Notes

- Safari desktop or real-device mobile verification is not run, but Chrome desktop and responsive QA pass.
- Known limitations are documented and do not block first public feedback.

### No-Go

- Build, lint, tests, or server typecheck fails.
- The app loads to a blank screen.
- Single-player cannot start.
- Multiplayer failure blocks single-player.
- Staging Socket.IO cannot connect because of environment or CORS configuration.

## Deferred Production Risks

- Rooms are in memory and disappear on server restart.
- There is no login or durable identity.
- There is no reconnect grace.
- There is no anti-cheat or inbound position rate limiting.
- Real-device mobile QA is still required before broader promotion.
```

- [x] **Step 3: Verify key deployment sections exist**

Run:

```bash
rg -n "Frontend Hosting Candidates|Multiplayer Server Hosting Candidates|Required Environment Variables|CORS Rules|Socket.IO Release Checks|Deployment Go/No-Go Criteria" docs/deployment-readiness.md
```

Expected: six matching lines.

- [x] **Step 4: Commit deployment readiness docs**

Run:

```bash
git add docs/deployment-readiness.md docs/superpowers/plans/2026-06-17-web-open-release-readiness.md
git commit -m "웹 오픈 배포 준비 기준 문서화"
```

Expected: commit succeeds.

## Task 3: Automated QA Results Document

**Files:**
- Create: `docs/web-open-qa-results.md`
- Modify: `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`

- [x] **Step 1: Capture release metadata**

Run:

```bash
git rev-parse --short HEAD
date +%F
```

Expected: first command prints the current short commit hash; second command prints the current date.

- [x] **Step 2: Run automated verification**

Run:

```bash
npm run lint
npm run test
npm run build
npm run server:check
```

Expected:

- `npm run lint`: exit code `0`
- `npm run test`: `Test Files  19 passed (19)` and `Tests  161 passed (161)`
- `npm run build`: exit code `0` and a Vite production build summary
- `npm run server:check`: exit code `0`

- [x] **Step 3: Create `docs/web-open-qa-results.md`**

Create the file with this content. Set the `Date` value to the date printed in Step 1. Set the `Verification commit` value to the short commit hash printed in Step 1.

```markdown
# Web Open QA Results

## Run Summary

- Date: `2026-06-17`
- Verification commit: `<use the short commit hash printed in Step 1>`
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
```

- [x] **Step 4: Replace the commit value**

Replace `<use the short commit hash printed in Step 1>` with the short commit hash from Step 1. Keep the date as `2026-06-17` unless Step 1 printed a different date.

- [x] **Step 5: Verify no dynamic marker remains**

Run:

```bash
rg -n "<use the short commit hash printed in Step 1>" docs/web-open-qa-results.md
```

Expected: no output and exit code `1`.

- [x] **Step 6: Commit automated QA results**

Run:

```bash
git add docs/web-open-qa-results.md docs/superpowers/plans/2026-06-17-web-open-release-readiness.md
git commit -m "웹 오픈 자동 검증 결과 기록"
```

Expected: commit succeeds.

## Task 4: Browser And Multiplayer QA Evidence

**Files:**
- Modify: `docs/web-open-qa-results.md`
- Modify: `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`
- Modify if QA finds a release blocker: `src/styles.css`

- [x] **Step 1: Start the multiplayer server**

Run:

```bash
PORT=5174 CLIENT_ORIGIN=http://127.0.0.1:5173 npm run server:start
```

Expected: server logs `multiplayer server listening on 5174`.

- [x] **Step 2: Start the web app**

Run in a separate terminal:

```bash
VITE_MULTIPLAYER_SERVER_URL=http://127.0.0.1:5174 npm run dev -- --host 127.0.0.1 --port 5173
```

Expected: Vite prints `Local:   http://127.0.0.1:5173/`.

- [x] **Step 3: Verify Chrome desktop**

Open `http://127.0.0.1:5173/` in Chrome or the in-app browser.

Check:

- Ready screen renders.
- `Single` button is visible.
- `Multiplayer` button is visible.
- Sound toggle is visible.
- Starting single-player enters a playable run.
- Restart works after game over.
- No fresh console errors appear during this path.

Update the Chrome row in `docs/web-open-qa-results.md` to:

```markdown
| Chrome desktop | Pass | Ready screen, single-player start, retry path, sound toggle, and console check passed. |
```

- [x] **Step 4: Verify mobile portrait**

Set viewport to `390x844`.

Check:

- Ready screen fits without horizontal overflow.
- Game HUD remains readable.
- Mobile survivor list remains collapsed in multiplayer UI.
- Game-over/retry controls remain visible.

Update the mobile portrait row:

```markdown
| Mobile portrait `390x844` | Pass | Ready/game-over layouts fit and controls remain visible. |
```

- [x] **Step 5: Verify mobile landscape**

Set viewport to `667x375`.

Check:

- Ready controls fit.
- Game-over retry action remains visible.
- Footer controls do not cover required actions.

Update the mobile landscape row:

```markdown
| Mobile landscape `667x375` | Pass | Ready and game-over controls remain visible in short landscape viewport. |
```

Execution note: QA found the game-over `Retry` button was clipped in `667x375`. The release-blocking fix hides `.run-highlight` inside game-over panels under the existing short-height media query. Re-verification passed with `Retry` fully inside the viewport.

- [x] **Step 6: Verify multiplayer create/join/countdown**

Use one browser client as host and a second client or Socket.IO test client as guest.

Check:

- Host creates a room and sees a 4-digit room code.
- Guest joins the same room code.
- Host starts countdown.
- Active players see `3 -> 2 -> 1 -> START`.
- Leaving a room returns to the single/multiplayer choice screen.

Update rows:

```markdown
| Create room | Pass | Host received a 4-digit room code. |
| Join room | Pass | Guest joined with the 4-digit room code. |
| Countdown | Pass | Active players entered synchronized countdown and match start. |
| Leave room | Pass | Leaving returned to the single/multiplayer choice screen. |
```

- [x] **Step 7: Verify max room size**

Use server-side test clients or existing automated test evidence.

If using automated evidence, run:

```bash
npm run test -- server/rooms.test.ts
```

Expected: `server/rooms.test.ts` passes and includes room capacity behavior.

Update the row:

```markdown
| Max room size | Pass | `npm run test -- server/rooms.test.ts` passed with room capacity coverage. |
```

- [x] **Step 8: Verify server unavailable paths**

Stop the multiplayer server and reload the web app with `VITE_MULTIPLAYER_SERVER_URL` still pointing to `http://127.0.0.1:5174`.

Check:

- Multiplayer shows a clear connection failure.
- Single-player still starts.

Update rows:

```markdown
| Server not configured | Pass | Covered by `useMultiplayerRoom` tests; single-player remains available. |
| Server stopped | Pass | Browser showed multiplayer connection failure while single-player still started. |
```

- [x] **Step 9: Update console section**

If no fresh browser errors are found, replace the console section with:

```markdown
## Console Errors

- Chrome desktop checked with no fresh runtime console errors on the ready, single-player, and retry path.
- Mobile responsive checks found no fresh runtime console errors.
```

If only Three's `Clock` deprecation warning appears, record it under notes rather than errors:

```markdown
## Console Errors

- No fresh runtime console errors found.
- Non-blocking warning observed: Three's `Clock` deprecation warning.
```

- [x] **Step 10: Update public opening decision**

If all automated checks and browser checks pass, keep:

```markdown
`go with notes`
```

Use `go with notes` because Safari desktop and real-device mobile can still remain manual/deferred checks. Use `no-go` if any release blocker appears.

- [ ] **Step 11: Commit browser QA evidence**

Run:

```bash
git add docs/web-open-qa-results.md docs/superpowers/plans/2026-06-17-web-open-release-readiness.md
git commit -m "웹 오픈 브라우저 검증 결과 기록"
```

Expected: commit succeeds.

## Task 5: Retrospective And Final Verification

**Files:**
- Create: `docs/retrospectives/2026-06-17-web-open-release-readiness.md`
- Modify: `docs/handoff.md`
- Modify: `docs/superpowers/plans/2026-06-17-web-open-release-readiness.md`

- [ ] **Step 1: Create the retrospective**

Create `docs/retrospectives/2026-06-17-web-open-release-readiness.md` with:

```markdown
# Web Open Release Readiness Retrospective

## What Changed

- Updated the handoff to reflect that the MVP is merged to `main` and is now a web-open candidate.
- Added deployment readiness notes for frontend hosting, multiplayer server hosting, environment variables, CORS, and Socket.IO release checks.
- Added web-open QA results with automated verification and browser/multiplayer evidence.

## What Went Well

- The pass stayed documentation-first and did not expand game scope.
- Existing automated tests covered the core game and multiplayer behavior.
- The QA results document separated release evidence from the reusable checklist.

## What Was Tricky

- Public opening readiness depends on browser and environment checks, not only unit tests.
- Safari desktop and real-device mobile checks may need manual follow-up.
- Multiplayer hosting has platform-specific WebSocket and cold-start behavior that cannot be proven locally.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`
- Browser QA recorded in `docs/web-open-qa-results.md`

## Follow-Up Work

- Choose staging hosting targets.
- Deploy frontend and multiplayer server to staging after separate user approval.
- Run staging Socket.IO QA against the deployed URLs.
- Decide whether first public opening is `go` or `go with notes`.
```

- [ ] **Step 2: Add final handoff note**

In `docs/handoff.md`, add this note near the top of `## Notes`:

```markdown
- The Web Open Release Readiness pass adds `docs/deployment-readiness.md` and `docs/web-open-qa-results.md`. Use those documents before approving staging or production deployment.
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run lint
npm run test
npm run build
npm run server:check
```

Expected:

- `npm run lint`: exit code `0`
- `npm run test`: 19 files and 161 tests pass
- `npm run build`: exit code `0`
- `npm run server:check`: exit code `0`

- [ ] **Step 4: Verify docs exist**

Run:

```bash
test -f docs/deployment-readiness.md
test -f docs/web-open-qa-results.md
test -f docs/retrospectives/2026-06-17-web-open-release-readiness.md
```

Expected: each command exits `0`.

- [ ] **Step 5: Verify no stale release-state text remains**

Run:

```bash
rg -n "pending final user review|Decide later whether `main` should receive|feature/pure-doodle-redesign" docs/handoff.md docs/deployment-readiness.md docs/web-open-qa-results.md
```

Expected: no output and exit code `1`.

- [ ] **Step 6: Commit final readiness docs**

Run:

```bash
git add docs/handoff.md docs/retrospectives/2026-06-17-web-open-release-readiness.md docs/superpowers/plans/2026-06-17-web-open-release-readiness.md
git commit -m "웹 오픈 릴리즈 준비 회고 추가"
```

Expected: commit succeeds.

- [ ] **Step 7: Final status check**

Run:

```bash
git status --short --branch
git log --oneline --decorate -6
```

Expected: branch is `feature/web-open-release-readiness`; working tree is clean; recent commits show the release-readiness commits.

## Task 6: Integration Recommendation

**Files:**
- No file changes unless the user asks for merge/push.

- [ ] **Step 1: Report completion state**

Report:

```text
Release-readiness docs are complete on feature/web-open-release-readiness.
Automated verification passed.
Browser QA result is recorded in docs/web-open-qa-results.md.
Deployment readiness criteria are recorded in docs/deployment-readiness.md.
```

- [ ] **Step 2: Ask for integration choice**

Offer:

```text
1. Merge feature/web-open-release-readiness into develop, verify, then merge to main
2. Push feature/web-open-release-readiness only
3. Keep branch local for review
```

- [ ] **Step 3: If the user chooses option 1**

Follow the established safe integration route:

```bash
git checkout develop
git pull --ff-only origin develop
git merge --no-ff feature/web-open-release-readiness -m "웹 오픈 릴리즈 준비 병합"
npm run lint
npm run test
npm run build
npm run server:check
git push origin develop
git checkout main
git pull --ff-only origin main
git merge --no-ff develop -m "웹 오픈 릴리즈 준비 메인 병합"
npm run lint
npm run test
npm run build
npm run server:check
git push origin main
```

Expected: all verification commands pass before each push.
