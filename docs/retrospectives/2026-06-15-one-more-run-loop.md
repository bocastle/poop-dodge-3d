# One More Run Loop Retrospective

## Summary

Added a compact replayability pass focused on making each run feel less flat: deterministic danger waves, fever feedback, brief drama slow motion, and a run highlight card on the single-player retry screen.

## What Went Well

- The danger wave logic was isolated in `src/game/waves.ts`, so timing, difficulty pressure, obstacle tuning, and drama time scale are covered by focused unit tests.
- The existing `GameStats` pipeline made it straightforward to surface wave, fever, and highlight state in the HUD without adding a new global store.
- The feature did not require server changes, so multiplayer room behavior stayed stable.

## Tradeoffs

- Waves are deterministic and procedural, not authored patterns. This keeps the pass small, but the waves may need playtest tuning.
- Drama slow motion is intentionally short and only triggered by panic close calls and shield saves. It does not yet predict every incoming hit.
- Multiplayer result highlights remain based on per-player badges rather than a full match highlight system.

## Verification

- `npm run test -- src/game/waves.test.ts src/game/feel.test.ts src/ui/GameOverlay.test.tsx`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run server:check`

## Follow-Up

- Browser-check the visual placement of the wave banner on desktop, mobile portrait, and mobile landscape.
- Tune wave timing and intensity after hands-on play.
- Consider authored wave patterns if procedural waves feel too random.
