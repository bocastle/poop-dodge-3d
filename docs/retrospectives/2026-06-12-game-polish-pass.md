# Game Polish Pass Retrospective

## What Changed

- Extracted gameplay tuning constants into `src/game/tuning.ts`.
- Added pure feedback helpers for warning cue intensity, player lean, camera shake, and score milestones.
- Added warning floor cues for falling obstacles.
- Improved player lean, reset behavior, and restrained hit camera shake.
- Added low procedural arena walls for stronger scene depth.
- Improved ready and game-over overlay copy, final score presentation, short-viewport layout handling, and live-region behavior.

## What Went Well

- Pure helpers kept feedback behavior testable without a canvas.
- Subagent implementation plus separate spec and code-quality reviews caught runtime polish issues early.
- Browser verification confirmed the short landscape game-over panel keeps the final score and restart button reachable.
- The work stayed browser-first and avoided deployment scope.

## What Was Tricky

- Warning opacity needed special handling because a single instanced material cannot vary alpha per instance directly.
- The initial camera shake implementation was too short-lived until the review loop pushed it into a persistent impact timer.
- The new final-score block increased panel height, so short mobile landscape needed explicit layout handling.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run preview`
- Desktop browser check at `1280x720`
- Mobile portrait browser check at `390x844`
- Mobile landscape game-over check at `667x375`

## Follow-Up Work

- Add sound effects after user approval.
- Replace procedural player and obstacle shapes with lightweight authored or generated assets after visual direction is approved.
- Test touch controls on a real mobile device.
- Consider code splitting if the Three.js chunk warning becomes a release concern.
