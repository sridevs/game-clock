import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { LocalGameRepository } from '../storage/GameRepository';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(1_000);
});
afterEach(() => { vi.useRealTimers(); });

async function setup(increment = false) {
  const user = userEvent.setup();
  render(<App repository={new LocalGameRepository(localStorage)} />);
  await user.selectOptions(screen.getByLabelText('Number of players'), '2');
  await user.clear(screen.getByLabelText('Starting minutes per player'));
  await user.type(screen.getByLabelText('Starting minutes per player'), '1');
  if (increment) {
    await user.click(screen.getByLabelText('Budget + increment'));
    await user.clear(screen.getByLabelText('Increment seconds per completed turn'));
    await user.type(screen.getByLabelText('Increment seconds per completed turn'), '15');
  }
  await user.click(screen.getByRole('button', { name: 'Create game' }));
  await user.click(screen.getByRole('button', { name: 'Start / resume' }));
  return user;
}

function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
function turn() { return screen.getByRole('button', { name: 'End turn' }); }
function row(name: string) {
  return screen.getAllByRole('listitem').find(item => within(item).queryByText(name))!;
}

it('preserves fixed budgets and wraps the player order', async () => {
  const user = await setup();
  advance(5_000); await user.click(turn());
  expect(row('Player 1')).toHaveTextContent('00:55');
  advance(3_000); await user.click(turn());
  expect(turn()).toHaveTextContent('Player 1');
  expect(turn()).toHaveTextContent('00:55');
  expect(row('Player 2')).toHaveTextContent('00:57');
  expect(screen.getByText('Turn 3 · Running')).toBeVisible();
});

it('awards the configured increment once even on a double click', async () => {
  const user = await setup(true);
  advance(5_000); await user.dblClick(turn());
  expect(row('Player 1')).toHaveTextContent('01:10');
  expect(row('Player 1')).toHaveTextContent('00:05 elapsed');
  expect(screen.getByText('Turn 2 · Running')).toBeVisible();
  expect(turn()).toHaveTextContent('Player 2');
});

it('resumes without charging time spent paused', async () => {
  const user = await setup();
  advance(5_000); await user.click(screen.getByRole('button', { name: 'Pause' }));
  advance(10_000); await user.click(turn());
  expect(turn()).toBeDisabled(); expect(turn()).toHaveTextContent('00:55');
  await user.click(screen.getByRole('button', { name: 'Start / resume' }));
  advance(2_000); expect(turn()).toHaveTextContent('00:53');
});

it('pauses when opening reset and retains time when cancelling', async () => {
  const user = await setup();
  advance(5_000); await user.click(screen.getByRole('button', { name: 'Reset game' }));
  expect(screen.getByRole('dialog', { name: 'Reset this game?' })).toBeVisible();
  advance(10_000); await user.click(screen.getByRole('button', { name: 'Keep game' }));
  expect(turn()).toHaveTextContent('00:55'); expect(turn()).toBeDisabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('never awards increment to an expired player and waits before starting the next', async () => {
  const user = await setup(true); advance(61_000);
  expect(screen.getByRole('status')).toHaveTextContent('Player 1 is out of time');
  expect(screen.getByRole('button', { name: 'Start / resume' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Pass expired player' }));
  expect(row('Player 1')).toHaveTextContent('00:00');
  expect(turn()).toHaveTextContent('Player 2'); expect(turn()).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Start / resume' }));
  advance(1_000); expect(turn()).toHaveTextContent('00:59');
});
