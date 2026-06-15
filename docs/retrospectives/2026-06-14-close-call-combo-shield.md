# Close Call Combo And Shield Retrospective

## What Changed

- Added close-call detection for near misses.
- Added combo multiplier state and bonus scoring.
- Added floating doodle callouts for close calls, combos, shield pickup, and shield saves.
- Added a single-use shield pickup that can save one collision and keep the run alive.
- Added a camera-facing doodle shield badge so pickups are readable in the 3D arena.
- Updated HUD status chips for combo, shield, and close-call count.
- Added pure helper tests for close-call tiering, combo timing, bonus scoring, shield spawning, shield placement, and shield collection.

## What Went Well

- Pure helpers made the gameplay-feel rules testable without browser automation.
- The feature built on the existing simple dodge loop instead of adding a large economy system.
- The HUD additions fit the paper-label visual direction without forcing a new UI pattern.
- Browser checks confirmed that the extra status row fits desktop, mobile portrait, and mobile landscape without page overflow.

## What Was Tricky

- Close-call detection needs to feel generous without awarding random far misses.
- Mobile landscape has limited vertical space for extra HUD chips, so the status row had to stay compact.
- The first shield visual was technically visible, but it read like a small floor token. A camera-facing badge made the pickup much clearer.
- Automated browser controls are not a perfect substitute for real touch input when testing shield collection under pressure.

## Verification Performed

- `npm run lint`
- `npm run test`
- `npm run build`
- `git diff --check`
- Desktop browser check at `1280x720`
- Mobile portrait browser check at `390x844`
- Mobile landscape browser check at `667x375`
- Browser console check for runtime errors
- Subagent code review

## Known Notes

- The production build still emits the existing large chunk warning because Three.js is bundled into the game entry.
- Browser console still shows Three's `Clock` deprecation warning from the current dependency stack.
- Browser keyboard automation did not reliably confirm shield pickup collection or shield-save continuation.
- Real-device mobile testing is still recommended before public release, especially for shield collection feel.
- The current pass intentionally excludes sound, economy, skins, ranking, login, server features, and deployment.

## Follow-Up Work

- Add short sound effects for close calls, shield pickup, and shield saves after user approval.
- Consider a stronger impact or slow-motion moment for shield saves if the core loop still needs more punch.
- Consider daily missions only after the base dodge loop feels good.
- Consider character skins only after the game has a stronger repeat-play loop.
