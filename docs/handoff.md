# Handoff

## Current State

- Repository: `poop-dodge-3d`
- Branch: `main`
- Remote: `https://github.com/bocastle/poop-dodge-3d.git`
- Project status: repository initialized with README and agent workflow documentation.
- Deployment status: no deployment. The current goal is web optimization before public release.

## Product Direction

Build a browser-first Three.js dodge game. The player avoids falling objects in a 3D scene. The first delivery target is a local web build that works well on desktop and mobile browsers.

## Working Agreement

- Keep documentation in English.
- Use `main -> develop -> feature/<feature-name>`.
- Use subagents only for independent work.
- Commit and push after each major feature.
- Write commit messages in Korean.
- Update this handoff document whenever the next developer needs fresh context.
- Add a retrospective under `docs/retrospectives/` after each major feature.

## Next Steps

1. Create `develop` from `main`.
2. Create `feature/project-foundation` from `develop`.
3. Scaffold the Vite, React, TypeScript, and Three.js project.
4. Add initial checks for linting, testing, and production build.
5. Update this handoff and add the first retrospective before merging into `develop`.

## Useful Commands

These commands are expected after the project is scaffolded:

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
- Keep the early game small: scene, player movement, falling objects, collision, score, restart, and mobile controls.
