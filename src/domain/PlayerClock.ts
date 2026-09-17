export interface PlayerData { name: string; remainingMs: number; elapsedMs: number }

export class PlayerClock {
  private remaining: number;
  private elapsed: number;

  constructor(readonly name: string, remainingMs: number, elapsedMs = 0) {
    if (!name.trim() || !Number.isFinite(remainingMs) || remainingMs < 0 ||
        !Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid player clock');
    this.remaining = remainingMs;
    this.elapsed = elapsedMs;
  }

  get remainingMs() { return this.remaining; }
  get elapsedMs() { return this.elapsed; }
  get expired() { return this.remaining === 0; }

  consume(milliseconds: number) {
    const spent = Math.min(this.remaining, Math.max(0, milliseconds));
    this.remaining -= spent;
    this.elapsed += spent;
  }

  reward(milliseconds: number) {
    if (!this.expired) this.remaining += milliseconds;
  }

  snapshot(): PlayerData {
    return { name: this.name, remainingMs: this.remaining, elapsedMs: this.elapsed };
  }
}
