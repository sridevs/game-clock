import { RoomClock, defaultSettings, type RoomSettings } from './RoomClock';
function game(settings: Partial<RoomSettings> = {}) { return RoomClock.create({ name: 'Sarkar', names: ['A', 'B'], settings: { ...defaultSettings, ...settings } }, 0); }

it('uses defaults, validates custom settings and detaches immutable views', () => {
  const clock = game(); expect(clock.view().players[0].remainingMs).toBe(900_000);
  expect(clock.view().settings).toEqual(defaultSettings);
  expect(Object.isFrozen(clock.view().players[0])).toBe(true);
  const snapshot = clock.snapshot(); snapshot.players[0].bank = 1;
  expect(clock.view().players[0].remainingMs).toBe(900_000);
  expect(() => game({ milestone: 0 })).toThrow(); expect(() => game({ handoffMs: 0 })).toThrow();
  expect(() => game({ bankMs: NaN })).toThrow();
  expect(() => RoomClock.create({ name: 'x', names: ['A', ' a '], settings: { ...defaultSettings } }, 0)).toThrow();
});
it('charges only the active player, excludes handoff, and wraps in fixed order', () => {
  const clock = game(); clock.start(0); clock.finish(2000);
  expect(clock.view().players.map(p => p.remainingMs)).toEqual([898000, 900000]);
  expect(clock.view().phase).toBe('handoff');
  clock.advance(6999); expect(clock.view().activeIndex).toBe(0);
  clock.advance(7000); expect(clock.view().activeIndex).toBe(1);
  clock.finish(10000); clock.advance(15000);
  expect(clock.view().activeIndex).toBe(0); expect(clock.view().players.map(p => p.elapsedMs)).toEqual([2000, 3000]);
});
it('awards recurring milestones on personal turns exactly once', () => {
  const clock = game({ milestone: 2, bonusMs: 6000, handoffMs: 1000 }); clock.start(0);
  for (let i = 0; i < 8; i++) {
    const end = i * 2000 + 1000; clock.finish(end);
    expect(() => clock.finish(end)).toThrow(); clock.advance(end + 1000);
  }
  expect(clock.view().players.map(p => p.completedTurns)).toEqual([4, 4]);
  expect(clock.view().players.map(p => p.remainingMs)).toEqual([908000, 908000]);
});
it.each([1000, 1001])('expiry wins over a milestone finish at %i', now => {
  const clock = game({ bankMs: 1000, milestone: 1, bonusMs: 10000 }); clock.start(0);
  expect(() => clock.finish(now)).toThrow();
  expect(clock.view().players[0]).toMatchObject({ bullet: true, remainingMs: 0, completedTurns: 1 });
  expect(clock.view().phase).toBe('handoff');
});
it('permanently enters bullet and provides a fresh allowance without carryover or bonus', () => {
  const clock = game({ bankMs: 1000, handoffMs: 1000, bulletMs: 5000, milestone: 1, bonusMs: 1000 }); clock.start(0);
  clock.advance(4000); expect(clock.view().activeIndex).toBe(0);
  expect(clock.view().players[0]).toMatchObject({ bullet: true, remainingMs: 5000 });
  clock.finish(5000); clock.advance(6000); clock.finish(7000); clock.advance(8000);
  expect(clock.view().players[0]).toMatchObject({ bullet: true, remainingMs: 5000, completedTurns: 2 });
  clock.advance(13000); expect(clock.view().phase).toBe('handoff');
  expect(clock.view().players[0].completedTurns).toBe(3);
});
it('preserves turn and handoff time across pause/resume', () => {
  const clock = game(); clock.start(0); clock.pause(1000); clock.advance(100000);
  expect(clock.view().players[0].remainingMs).toBe(899000);
  clock.resume(100000); clock.finish(101000); clock.pause(103000);
  expect(clock.view().remainingMs).toBe(3000);
  clock.advance(200000); clock.resume(200000); clock.advance(202999);
  expect(clock.view().phase).toBe('handoff'); clock.advance(203000);
  expect(clock.view().activeIndex).toBe(1); expect(clock.view().players[0].completedTurns).toBe(1);
});
it('restores running and paused phases and validates corrupt persistence', () => {
  const clock = game(); clock.start(0); clock.finish(2000); clock.pause(3000);
  const restored = RoomClock.restore(clock.snapshot()); restored.advance(50000);
  expect(restored.view()).toEqual(clock.view()); restored.resume(50000); restored.advance(54000);
  expect(restored.view().activeIndex).toBe(1);
  const active = RoomClock.restore(restored.snapshot()); active.advance(55000);
  expect(active.view().players[1].remainingMs).toBe(899000);
  expect(() => RoomClock.restore({ ...clock.snapshot(), active: 8 })).toThrow();
  expect(() => RoomClock.restore({ ...clock.snapshot(), remaining: -1 })).toThrow();
});
it('handles years of delayed deadlines in bounded work, equivalent to short steps', () => {
  const clock = game({ bankMs: 1000, bulletMs: 1000, handoffMs: 1000 }); clock.start(0);
  const stepped = RoomClock.restore(clock.snapshot());
  for (let t = 100; t <= 60000; t += 100) stepped.advance(t);
  clock.advance(60000); expect(clock.snapshot()).toEqual(stepped.snapshot());
  clock.advance(10 * 365 * 86400_000);
  expect(clock.view().players.every(p => p.bullet)).toBe(true);
  expect(clock.view().players[0].completedTurns).toBeGreaterThan(1000000);
});
it('scales urgency with the starting bank and bonuses can restore green', () => {
  const clock = game({ bankMs: 9000, milestone: 1, bonusMs: 9000 }); clock.start(0);
  clock.advance(3000); expect(clock.view().players[0].tone).toBe('amber');
  clock.advance(6001); expect(clock.view().players[0].tone).toBe('red');
  clock.finish(7000); expect(clock.view().players[0].tone).toBe('green');
});
it('ignores backwards time and resets all rules to a ready game', () => {
  const clock = game({ bankMs: 1000 }); clock.start(1000); clock.advance(500);
  expect(clock.view().remainingMs).toBe(1000); clock.advance(2000); clock.reset(5000);
  expect(clock.view()).toMatchObject({ phase: 'ready', turn: 1, activeIndex: 0, paused: false });
  expect(clock.view().players[0]).toMatchObject({ bullet: false, elapsedMs: 0, completedTurns: 0 });
});
