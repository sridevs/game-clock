# Sarkar Clock

[Open the game clock](https://sridevs.github.io/game-clock/).

## Modes

**On Table is available now.** One person controls all players on one phone,
tablet, or laptop. It runs entirely in the browser on GitHub Pages: no backend,
account, password, or Cloudflare service is needed. The page needs a connection
to load; an already loaded clock continues without a connection.

**Multiplayer is the next development step.** Its tab is disabled until
password-protected Cloudflare rooms, device sessions, synchronization, and server
authorization are complete and tested. It is not deployed in this release.

## On Table Rules

- Name the game and 2-8 players in fixed turn order.
- Defaults: 15 minutes per player, +3 minutes every 5 personal completed turns,
  60 seconds per bullet turn, and a 5-second neutral handoff. All are configurable.
- Only the active player's bank decreases. Unused bank time carries forward.
- Finish turn starts the neutral countdown. The next clock starts automatically.
- Bank expiry ends the turn and permanently moves that player into bullet mode.
  Each subsequent turn receives a fresh bullet allowance with no carryover.
- Expiry wins at an exact milestone boundary; bullet players never earn bonuses.
  Timeout ends a personal turn but does not eliminate the player.
- Pause/resume preserves both active-turn and handoff time. Pauses do not count
  as turns and there is no separate interference-resolution mode.
- Green above two thirds of the starting bank, amber from one third through two
  thirds, red below one third. Bonuses can restore green. Bullet mode is burgundy.
  Status text accompanies color and the slow red border respects reduced motion.
- Reset restores the same players/settings; New game returns to setup. Both
  require confirmation. Opening either confirmation pauses the clock.

## Persistence

Each command and automatic transition saves a versioned snapshot to localStorage.
Page hiding also checkpoints time. Refresh/background recovery processes elapsed
deadlines, including missed handoffs and expiries, without restarting the timer.
Long gaps after all players enter bullet mode are processed by skipping complete
cycles. A manual system-clock change can affect a standalone clock.

Opening another On Table tab transfers control through BroadcastChannel. The
older tab stops accepting actions and shows a takeover control. Browsers without
BroadcastChannel should use only one tab. Game data never leaves this browser.
Private browsing, cleared browser data, or unavailable storage can prevent recovery;
save failures are shown in the app.

Previous fixed-budget/increment saves are left untouched. If one exists, the setup
screen offers **Resume previous fixed / increment game** with its original rules.

## Develop and Verify

Node 22.12+ is recommended.

```sh
npm ci
npm run dev
npm test
npm run build
```

RoomClock and its private player models own the new rules independently of React,
storage, and transport. Commands accept time for deterministic tests. view()
returns deeply frozen, detached display data; mutable persistence snapshots are
separate. TableRepository owns browser persistence. The legacy GameClock is
retained solely for existing saved games.

Tests cover milestone boundaries, duplicate finishes, bullet fallback, fixed order,
active and handoff pauses, proportional urgency, resets, corrupted snapshots,
years of delayed deadlines, and accessible React workflows. Browser checks cover
desktop/mobile layouts, automatic handoff, pause/resume, refresh and tab takeover.
These checks are not a real four-device/four-hour multiplayer test.

## Deployment

The existing GitHub Actions workflow tests and type-checks/builds every update,
then deploys main to GitHub Pages. Relative asset URLs support /game-clock/.
On Table requires no deployment secrets and creates no paid infrastructure.
The Apache license is unchanged.
