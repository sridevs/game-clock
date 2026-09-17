import { GameClock } from './GameClock';
import { PlayerClock } from './PlayerClock';

const create = (incrementSeconds = 0) => GameClock.create({ name: 'Friday', names: ['A', 'B'], minutes: 1, incrementSeconds });

describe('GameClock', () => {
  it('exposes frozen detached views rather than mutable player models', () => {
    const game = create(); const view = game.view();
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.players)).toBe(true);
    expect(Object.isFrozen(view.activePlayer)).toBe(true);
    expect(view.activePlayer).not.toHaveProperty('consume');
    game.toggle(0); game.tick(1_000);
    expect(view.activePlayer.remainingMs).toBe(60_000);
    expect(game.view().activePlayer.remainingMs).toBe(59_000);
  });

  it('owns toggle and completion decisions, including expired turns', () => {
    const game = create(10);
    game.completeTurn(0); expect(game.view().turn).toBe(1);
    game.toggle(0); game.toggle(1_000);
    expect(game.view().running).toBe(false);
    game.toggle(2_000); game.completeTurn(3_000);
    expect(game.view().activePlayer.name).toBe('B');
    expect(game.view().players[0].remainingMs).toBe(68_000);
    game.tick(100_000); game.completeTurn(100_000);
    expect(game.view().activePlayer.name).toBe('A');
    expect(game.view().running).toBe(false);
  });
  it('charges only the active player and wraps fixed turn order', () => {
    const game = create(); game.start(0); game.endTurn(12_000);
    expect(game.view().players[0].remainingMs).toBe(48_000);
    expect(game.view().activePlayer.name).toBe('B');
    game.endTurn(15_000);
    expect(game.view().players[1].elapsedMs).toBe(3_000);
    expect(game.view().activePlayer.name).toBe('A'); expect(game.view().turn).toBe(3);
  });

  it('adds increment to the outgoing player, carrying unused time forward', () => {
    const game = create(10); game.start(0); game.endTurn(5_000);
    expect(game.view().players[0].remainingMs).toBe(65_000);
    expect(game.view().players[0].elapsedMs).toBe(5_000);
    expect(game.view().elapsedMs).toBe(5_000);
  });

  it('does not award increment on pause or on a paused end-turn', () => {
    const game = create(10); game.start(0); game.pause(2_000);
    game.tick(9_000); game.endTurn(10_000);
    expect(game.view().activePlayer.remainingMs).toBe(58_000); expect(game.view().turn).toBe(1);
    game.start(20_000); game.tick(21_000);
    expect(game.view().activePlayer.remainingMs).toBe(57_000);
  });

  it('clamps background elapsed time at expiry and never revives through increment', () => {
    const game = create(10); game.start(0); game.endTurn(90_000);
    expect(game.view().activePlayer.remainingMs).toBe(0); expect(game.view().elapsedMs).toBe(60_000);
    expect(game.view().running).toBe(false); expect(game.view().turn).toBe(1);
    game.start(100_000); expect(game.view().running).toBe(false);
    game.passExpired(); expect(game.view().activePlayer.name).toBe('B'); expect(game.view().running).toBe(false);
  });

  it('restores a running clock against its persisted timestamp', () => {
    const game = create(5); game.start(1_000); game.tick(3_000);
    const restored = GameClock.restore(JSON.parse(JSON.stringify(game.snapshot())));
    restored.tick(10_000);
    expect(restored.view().activePlayer.remainingMs).toBe(51_000);
    expect(restored.view().incrementMs).toBe(5_000);
  });

  it('ignores backwards wall-clock movement without counting the recovery twice', () => {
    const game = create(); game.start(10_000); game.tick(9_000); game.tick(11_000);
    expect(game.view().activePlayer.elapsedMs).toBe(1_000);
  });

  it('rejects invalid configuration and saved state', () => {
    expect(() => GameClock.create({ name: '', names: ['A'], minutes: NaN, incrementSeconds: -1 })).toThrow();
    expect(() => GameClock.restore({ ...create().snapshot(), activeIndex: 99 })).toThrow();
  });
});

describe('PlayerClock', () => {
  it('owns its time data and returns independent snapshots', () => {
    const clock = new PlayerClock('A', 5_000);
    const snapshot = clock.snapshot(); snapshot.remainingMs = 0;
    clock.consume(-100); expect(clock.snapshot().remainingMs).toBe(5_000);
    clock.consume(9_000); clock.reward(1_000);
    expect(clock.snapshot().remainingMs).toBe(0); expect(clock.snapshot().elapsedMs).toBe(5_000);
  });
});
