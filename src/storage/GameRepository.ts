import { GameClock } from '../domain/GameClock';

export interface GameRepository { load(): GameClock | null; save(game: GameClock): void; clear(): void }

export class LocalGameRepository implements GameRepository {
  private readonly key = 'sarkar-react-v1';
  constructor(private readonly storage: Storage) {}

  load() {
    try {
      const value = this.storage.getItem(this.key);
      return value ? GameClock.restore(JSON.parse(value)) : null;
    } catch { return null; }
  }

  save(game: GameClock) { this.storage.setItem(this.key, JSON.stringify(game.snapshot())); }
  clear() { this.storage.removeItem(this.key); }
}
