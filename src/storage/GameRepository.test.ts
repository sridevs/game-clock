import { GameClock } from '../domain/GameClock';
import { LocalGameRepository } from './GameRepository';

beforeEach(() => localStorage.clear());
it('round-trips and clears domain objects', () => {
  const repository = new LocalGameRepository(localStorage);
  const game = GameClock.create({ name: 'Game', names: ['A', 'B'], minutes: 20, incrementSeconds: 5 });
  repository.save(game); expect(repository.load()?.snapshot()).toEqual(game.snapshot());
  repository.clear(); expect(repository.load()).toBeNull();
});
it('discards malformed saved games without crashing', () => {
  localStorage.setItem('sarkar-react-v1', '{bad');
  expect(new LocalGameRepository(localStorage).load()).toBeNull();
});
