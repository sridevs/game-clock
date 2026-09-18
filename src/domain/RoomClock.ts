export interface RoomSettings { bankMs: number; milestone: number; bonusMs: number; bulletMs: number; handoffMs: number }
export const defaultSettings: Readonly<RoomSettings> = Object.freeze({ bankMs: 900_000, milestone: 5, bonusMs: 180_000, bulletMs: 60_000, handoffMs: 5_000 });
export interface RoomConfig { name: string; names: string[]; settings: RoomSettings }
interface PlayerState { name: string; bank: number; bullet: boolean; allowance: number; elapsed: number; turns: number }
export interface ClockState { version: 1; config: RoomConfig; players: PlayerState[]; active: number; phase: 'ready' | 'turn' | 'handoff'; paused: boolean; remaining: number; at: number; turn: number }
export interface RoomPlayerView { readonly name: string; readonly remainingMs: number; readonly elapsedMs: number; readonly completedTurns: number; readonly bonusProgress: number; readonly bullet: boolean; readonly tone: 'green' | 'amber' | 'red' | 'bullet' }
export interface RoomClockView { readonly name: string; readonly settings: Readonly<RoomSettings>; readonly players: readonly RoomPlayerView[]; readonly activeIndex: number; readonly phase: ClockState['phase']; readonly paused: boolean; readonly remainingMs: number; readonly deadline: number | null; readonly serverNow: number; readonly turn: number }

class BankPlayer {
  constructor(private state: PlayerState) {}
  static create(name: string, bank: number) { return new BankPlayer({ name, bank, bullet: false, allowance: 0, elapsed: 0, turns: 0 }); }
  remaining() { return this.state.bullet ? this.state.allowance : this.state.bank; }
  isBullet() { return this.state.bullet; }
  begin(bulletMs: number) { if (this.state.bullet) this.state.allowance = bulletMs; }
  consume(ms: number) {
    const spent = Math.min(ms, this.remaining());
    this.state.elapsed += spent;
    if (this.state.bullet) this.state.allowance -= spent;
    else this.state.bank -= spent;
  }
  finish(settings: RoomSettings, expired: boolean) {
    this.state.turns++;
    if (expired) this.state.bullet = true;
    if (!this.state.bullet && this.state.turns % settings.milestone === 0) this.state.bank += settings.bonusMs;
  }
  skipBulletTurns(turns: number, bulletMs: number) { this.state.turns += turns; this.state.elapsed += turns * bulletMs; this.state.allowance = 0; }
  snapshot(): PlayerState { return { ...this.state }; }
  view(settings: RoomSettings): RoomPlayerView {
    const remainingMs = this.remaining();
    return Object.freeze({ name: this.state.name, remainingMs, elapsedMs: this.state.elapsed, completedTurns: this.state.turns,
      bonusProgress: this.state.turns % settings.milestone, bullet: this.state.bullet,
      tone: this.state.bullet ? 'bullet' : remainingMs > settings.bankMs * 2 / 3 ? 'green' : remainingMs >= settings.bankMs / 3 ? 'amber' : 'red' });
  }
}

export class RoomClock {
  private constructor(private state: Omit<ClockState, 'players'>, private players: BankPlayer[]) {}
  static create(config: RoomConfig, now: number) {
    if (!config || typeof config.name !== 'string' || !config.name.trim() || config.name.length > 80 || !Array.isArray(config.names) || config.names.length < 2 || config.names.length > 8 ||
      config.names.some(n => typeof n !== 'string' || !n.trim() || n.length > 40) || new Set(config.names.map(n => n.trim().toLowerCase())).size !== config.names.length) throw new Error('Use a game name and 2-8 distinct player names.');
    const s = config.settings;
    if (!s || ![s.bankMs, s.milestone, s.bonusMs, s.bulletMs, s.handoffMs].every(Number.isSafeInteger) || s.bankMs < 1000 || s.bankMs > 36_000_000 || s.milestone < 1 || s.milestone > 100 || s.bonusMs < 0 || s.bonusMs > 3_600_000 || s.bulletMs < 1000 || s.bulletMs > 3_600_000 || s.handoffMs < 1000 || s.handoffMs > 300_000) throw new Error('Invalid room time settings.');
    const clean = { name: config.name.trim(), names: config.names.map(n => n.trim()), settings: { ...s } };
    return new RoomClock({ version: 1, config: clean, active: 0, phase: 'ready', paused: false, remaining: s.bankMs, at: now, turn: 1 }, clean.names.map(n => BankPlayer.create(n, s.bankMs)));
  }
  static restore(data: ClockState) {
    if (!data || data.version !== 1) throw new Error('Unsupported saved clock');
    RoomClock.create(data.config, data.at);
    if (!Array.isArray(data.players) || data.players.length !== data.config.names.length ||
      !Number.isInteger(data.active) || data.active < 0 || data.active >= data.players.length ||
      !['ready', 'turn', 'handoff'].includes(data.phase) || typeof data.paused !== 'boolean' ||
      !Number.isFinite(data.at) || !Number.isFinite(data.remaining) || data.remaining <= 0 ||
      !Number.isSafeInteger(data.turn) || data.turn < 1 || (data.phase === 'ready' && data.paused) ||
      data.players.some((p, i) => !p || p.name !== data.config.names[i] || typeof p.bullet !== 'boolean' ||
        ![p.bank, p.allowance, p.elapsed, p.turns].every(n => Number.isFinite(n) && n >= 0) ||
        !Number.isSafeInteger(p.turns) || (p.bullet && p.bank !== 0) || (!p.bullet && p.bank <= 0))) throw new Error('Invalid saved clock');
    const active = data.players[data.active];
    if ((data.phase === 'turn' && data.remaining !== (active.bullet ? active.allowance : active.bank)) ||
      (data.phase === 'handoff' && data.remaining > data.config.settings.handoffMs)) throw new Error('Invalid saved phase');
    const copy = structuredClone(data);
    const { players, ...state } = copy;
    return new RoomClock(state, players.map(p => new BankPlayer(p)));
  }
  private active() { return this.players[this.state.active]; }
  deadline() { return this.state.phase === 'ready' || this.state.paused ? null : this.state.at + this.state.remaining; }
  start(now: number) { if (this.state.phase !== 'ready') throw new Error('Game already started'); this.state.phase = 'turn'; this.state.at = now; }
  advance(now: number): boolean {
    if (this.deadline() === null || now <= this.state.at) return false;
    let transitioned = false;
    while (now >= this.state.at + this.state.remaining) {
      // Once every bank is exhausted, complete cycles are identical and can be skipped.
      if (this.state.phase === 'handoff' && this.state.remaining === this.state.config.settings.handoffMs && this.players.every(p => p.isBullet())) {
        const { bulletMs, handoffMs } = this.state.config.settings;
        const cycle = this.players.length * (bulletMs + handoffMs);
        const cycles = Math.floor((now - this.state.at) / cycle);
        if (cycles > 0) { this.players.forEach(p => p.skipBulletTurns(cycles, bulletMs)); this.state.at += cycles * cycle; this.state.turn += cycles * this.players.length; transitioned = true; }
        if (now < this.state.at + this.state.remaining) break;
      }
      const end = this.state.at + this.state.remaining;
      if (this.state.phase === 'turn') { this.active().consume(this.state.remaining); this.finishAt(end, true); }
      else {
        this.state.active = (this.state.active + 1) % this.players.length;
        this.state.turn++;
        this.active().begin(this.state.config.settings.bulletMs);
        this.state.phase = 'turn'; this.state.remaining = this.active().remaining(); this.state.at = end;
      }
      transitioned = true;
    }
    const elapsed = now - this.state.at;
    if (this.state.phase === 'turn') this.active().consume(elapsed);
    this.state.remaining -= elapsed; this.state.at = now;
    return transitioned;
  }
  finish(now: number) {
    if (this.advance(now)) throw new Error('The clock advanced. Refresh and try again.');
    if (this.state.phase !== 'turn' || this.state.paused) throw new Error('No running turn to finish');
    this.finishAt(now, false);
  }
  private finishAt(now: number, expired: boolean) { this.active().finish(this.state.config.settings, expired); this.state.phase = 'handoff'; this.state.remaining = this.state.config.settings.handoffMs; this.state.at = now; }
  pause(now: number) { this.advance(now); if (this.state.phase === 'ready' || this.state.paused) throw new Error('Clock is not running'); this.state.paused = true; }
  resume(now: number) { if (!this.state.paused) throw new Error('Clock is not paused'); this.state.paused = false; this.state.at = now; }
  reset(now: number) { const fresh = RoomClock.create(this.state.config, now); this.state = fresh.state; this.players = fresh.players; }
  snapshot(): ClockState { return { ...structuredClone(this.state), players: this.players.map(p => p.snapshot()) }; }
  view(): RoomClockView {
    return Object.freeze({ name: this.state.config.name, settings: Object.freeze({ ...this.state.config.settings }), players: Object.freeze(this.players.map(p => p.view(this.state.config.settings))), activeIndex: this.state.active, phase: this.state.phase, paused: this.state.paused, remainingMs: this.state.remaining, deadline: this.deadline(), serverNow: this.state.at, turn: this.state.turn });
  }
}
