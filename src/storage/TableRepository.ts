import { RoomClock } from '../domain/RoomClock';

export class TableRepository {
  constructor(private readonly storage: Storage, private readonly key = 'sarkar-table-v2') {}
  load(): RoomClock | null {
    const raw = this.storage.getItem(this.key);
    return raw ? RoomClock.restore(JSON.parse(raw)) : null;
  }
  save(clock: RoomClock) { this.storage.setItem(this.key, JSON.stringify(clock.snapshot())); }
  clear() { this.storage.removeItem(this.key); }
}
