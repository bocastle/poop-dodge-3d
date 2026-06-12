# Handoff

## Current State

- Repository: `poop-dodge-3d`
- Current branch: `develop`
- Integration branch: `develop`
- Remote: `https://github.com/bocastle/poop-dodge-3d.git`
- Project status: local web MVP implemented and a game-polish pass is in progress on `feature/game-polish-pass`.
- Deployment status: no deployment. The current goal is web optimization before public release.

## Product Direction

Build a browser-first Three.js dodge game. The player avoids falling objects in a 3D scene. The first delivery target is a local web build that works well on desktop and mobile browsers.

The MVP now includes:

- Vite, React, TypeScript, and React Three Fiber foundation
- Full-viewport 3D scene with camera, lights, floor, player, and instanced falling obstacles
- Desktop keyboard controls with `WASD` and arrow keys
- Mobile-oriented pointer drag controls
- Score, best score, dodge count, elapsed time, game-over, and restart state
- Local high-score persistence through `localStorage`
- Responsive HUD and safe-area-aware layout
- Game polish pass with extracted tuning constants, warning floor cues, improved player lean, restrained camera shake, low arena walls, stronger game-over presentation, and short-viewport panel handling
- Unit tests for movement, collision, difficulty, score, and high-score logic

## Working Agreement

- Keep documentation in English.
- Use `main -> develop -> feature/<feature-name>`.
- Use subagents only for independent work.
- Commit and push after each major feature.
- Write commit messages in Korean.
- Update this handoff document whenever the next developer needs fresh context.
- Add a retrospective under `docs/retrospectives/` after each major feature.

## Next Steps

1. Continue from `develop`.
2. Create the next feature branch, likely `feature/web-optimization` or `feature/game-polish`.
3. For stronger mobile confidence, test touch controls on a real iOS Safari or Android Chrome device.
4. Decide whether `main` should receive the MVP after user review.
5. Decide whether the next feature should focus on sound, authored assets, model replacement, or real-device mobile tuning.

## Useful Commands

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

## Notes

- Do not deploy until the user explicitly approves deployment.
- Do not start implementation work before the current feature design is approved.
- The production build currently emits a large chunk warning because Three.js is bundled in the game entry. The gzipped JS is about 297 kB in the verified build.
- Browser verification was performed in Chrome against `npm run preview`.
- The latest mobile layout pass constrains the HUD and start/game-over panel to fit narrow browser widths without horizontal clipping.
- The game-polish pass was browser-checked at desktop `1280x720`, mobile portrait `390x844`, and mobile landscape `667x375`; the landscape game-over panel kept the final score and restart button in view.
- Mobile touch logic is implemented, but real-device mobile testing is still recommended before public release.
- The game still uses procedural primitives only. Replacing the player and obstacles with authored models is intentionally deferred.
