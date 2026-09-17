# Sarkar Clock

A mobile-first React SPA for one shared tabletop device. Fixed player budgets or Fischer-style increment after each completed turn. Fixed turn order, pause/resume, timeout handling, confirmed reset, and browser-local recovery.

## Develop

Node 22.12+ is recommended.

```sh
npm ci
npm run dev
npm test
npm run build
```

## Design

- `PlayerClock` owns remaining/elapsed time and budget behavior.
- `GameClock` owns turn order, timestamps, pause, increment, expiry and snapshots. The caller supplies time for deterministic tests.
- `GameRepository` is the persistence boundary; `LocalGameRepository` implements browser storage.
- React components render models and dispatch actions. They do not calculate clock rules.
- Vitest exercises models and storage; React Testing Library exercises user-facing controls.

No Redux, router, server or accounts. Plain CSS. Small methods and composition rather than an inheritance hierarchy. Only completed turns receive an increment. Expired players cannot gain time; passing an expired player keeps the game paused. Opening reset pauses play; cancel preserves the paused game. A 500ms guard rejects accidental double taps.

## GitHub Pages

Push to a repository with default branch `main`. In Settings → Pages, choose **GitHub Actions** as the source. The supplied workflow runs tests and TypeScript/build checks before deploying `dist`. Relative asset paths support project Pages URLs. No secrets are needed.

## Limits

Game names and state stay in localStorage on this device/browser. Use one tab as the controller. Refresh restores a running timer and includes time spent away. A manual system-clock change can affect elapsed time. Local storage is not a shared-game service; passwords and multi-device rooms require a backend and are not implemented. The public app does not transmit game state.
