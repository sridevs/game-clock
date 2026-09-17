import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { Setup } from './Setup';
import { LocalGameRepository } from '../storage/GameRepository';
import { GameClock } from '../domain/GameClock';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); });

it('creates a named increment game with editable players', async () => {
  const user = userEvent.setup(); const create = vi.fn();
  render(<Setup onCreate={create} />);
  await user.selectOptions(screen.getByLabelText('Number of players'), '2');
  await user.clear(screen.getByLabelText('Player 1'));
  await user.type(screen.getByLabelText('Player 1'), 'Sridev');
  await user.click(screen.getByLabelText('Budget + increment'));
  await user.clear(screen.getByLabelText('Increment seconds per completed turn'));
  await user.type(screen.getByLabelText('Increment seconds per completed turn'), '15');
  await user.click(screen.getByRole('button', { name: 'Create game' }));
  expect(create).toHaveBeenCalledWith({ name: 'Sarkar night', names: ['Sridev', 'Player 2'], minutes: 20, incrementSeconds: 15 });
});

function renderGame() {
  const repository = new LocalGameRepository(localStorage);
  repository.save(GameClock.create({ name: 'Game', names: ['A', 'B'], minutes: 1, incrementSeconds: 10 }));
  return { repository, ...render(<App repository={repository} />) };
}

it('runs, adds one increment, blocks rapid repeat taps and pauses', () => {
  vi.useFakeTimers(); vi.setSystemTime(1_000);
  const { repository } = renderGame();
  expect(screen.getByRole('button', { name: 'End turn' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Start / resume' }));
  act(() => { vi.advanceTimersByTime(5_000); });
  fireEvent.click(screen.getByRole('button', { name: 'End turn' }));
  fireEvent.click(screen.getByRole('button', { name: 'End turn' }));
  expect(repository.load()?.turn).toBe(2);
  expect(repository.load()?.players[0].remainingMs).toBe(65_000);
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  act(() => { vi.advanceTimersByTime(5_000); });
  expect(repository.load()?.players[1].remainingMs).toBe(60_000);
});

it('preserves the paused game on cancel and clears it only on confirmation', async () => {
  const user = userEvent.setup(); const { repository } = renderGame();
  await user.click(screen.getByRole('button', { name: 'Reset game' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Keep game' }));
  expect(repository.load()).not.toBeNull();
  await user.click(screen.getByRole('button', { name: 'Reset game' }));
  await user.click(screen.getByRole('button', { name: 'Confirm reset' }));
  expect(repository.load()).toBeNull(); expect(screen.getByText('Set the table.')).toBeVisible();
});

it('recovers a running game after remount', () => {
  vi.useFakeTimers(); vi.setSystemTime(1_000);
  const first = renderGame(); fireEvent.click(screen.getByRole('button', { name: 'Start / resume' }));
  first.unmount(); vi.setSystemTime(11_000);
  render(<App repository={first.repository} />);
  expect(screen.getByRole('button', { name: 'End turn' })).toHaveTextContent('00:50');
});

it('stops on timeout and lets the table pass the expired player', () => {
  vi.useFakeTimers(); vi.setSystemTime(1_000); renderGame();
  fireEvent.click(screen.getByRole('button', { name: 'Start / resume' }));
  act(() => { vi.advanceTimersByTime(61_000); });
  expect(screen.getByRole('status')).toHaveTextContent('A is out of time');
  fireEvent.click(screen.getByRole('button', { name: 'Pass expired player' }));
  expect(screen.getByRole('button', { name: 'Start / resume' })).toBeEnabled();
});
