import { PlayerClock, type PlayerData } from './PlayerClock';

export interface GameConfig { name: string; names: string[]; minutes: number; incrementSeconds: number }
export interface GameData {
  version: 1; name: string; players: PlayerData[]; incrementMs: number;
  activeIndex: number; turn: number; running: boolean; lastAt: number | null;
}

export class GameClock {
  private index = 0;
  private turnCount = 1;
  private ticking = false;
  private lastAt: number | null = null;

  private constructor(readonly name: string, readonly players: readonly PlayerClock[], readonly incrementMs: number) {}

  static create(config: GameConfig) {
    if (!config.name.trim() || config.names.length < 2 || config.names.length > 8 ||
        !Number.isFinite(config.minutes) || config.minutes < 1 || config.minutes > 600 ||
        !Number.isFinite(config.incrementSeconds) || config.incrementSeconds < 0 || config.incrementSeconds > 600)
      throw new Error('Enter a game name, 2–8 players and valid time limits.');
    return new GameClock(config.name.trim(), config.names.map(name =>
      new PlayerClock(name.trim(), config.minutes * 60_000)), config.incrementSeconds * 1000);
  }

  static restore(data: GameData) {
    if (data.version !== 1 || !data.name || !Array.isArray(data.players) ||
        data.players.length < 2 || data.players.length > 8 ||
        !Number.isInteger(data.activeIndex) || data.activeIndex < 0 || data.activeIndex >= data.players.length ||
        !Number.isInteger(data.turn) || data.turn < 1 || typeof data.running !== 'boolean' ||
        !Number.isFinite(data.incrementMs) || data.incrementMs < 0 || data.incrementMs > 600_000 ||
        (data.running && (data.lastAt === null || !Number.isFinite(data.lastAt)))) throw new Error('Invalid saved game');
    const game = new GameClock(data.name, data.players.map(p => new PlayerClock(p.name, p.remainingMs, p.elapsedMs)), data.incrementMs);
    game.index = data.activeIndex;
    game.turnCount = data.turn;
    game.ticking = data.running;
    game.lastAt = data.lastAt;
    return game;
  }

  get active() { return this.players[this.index]; }
  get activeIndex() { return this.index; }
  get turn() { return this.turnCount; }
  get running() { return this.ticking; }
  get elapsedMs() { return this.players.reduce((total, p) => total + p.elapsedMs, 0); }

  start(now: number) {
    if (this.ticking || this.active.expired) return;
    this.ticking = true;
    this.lastAt = now;
  }

  tick(now: number) {
    if (!this.ticking || this.lastAt === null) return;
    this.active.consume(now - this.lastAt);
    this.lastAt = Math.max(now, this.lastAt);
    if (this.active.expired) this.stop();
  }

  pause(now: number) { this.tick(now); this.stop(); }

  endTurn(now: number) {
    if (!this.ticking) return;
    this.tick(now);
    if (!this.ticking) return;
    this.active.reward(this.incrementMs);
    this.advance();
    if (this.active.expired) this.stop();
  }

  passExpired() {
    if (!this.ticking && this.active.expired) this.advance();
  }

  snapshot(): GameData {
    return { version: 1, name: this.name, players: this.players.map(p => p.snapshot()),
      incrementMs: this.incrementMs, activeIndex: this.index, turn: this.turnCount,
      running: this.ticking, lastAt: this.lastAt };
  }

  private advance() { this.index = (this.index + 1) % this.players.length; this.turnCount++; }
  private stop() { this.ticking = false; this.lastAt = null; }
}
