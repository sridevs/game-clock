import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { TableApp } from './TableApp';
import { TableRepository } from '../storage/TableRepository';
import { RoomClock, defaultSettings, type RoomSettings } from '../domain/RoomClock';
import { GameClock } from '../domain/GameClock';
import { LocalGameRepository } from '../storage/GameRepository';
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(1000); vi.stubGlobal('BroadcastChannel', undefined); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function setup(settings: Partial<RoomSettings> = {}) {
  const repository = new TableRepository(localStorage);
  repository.save(RoomClock.create({ name: 'Table night', names: ['A', 'B'], settings: { ...defaultSettings, ...settings } }, Date.now()));
  return { repository, ...render(<TableApp repository={repository} />) };
}
function click(name: string) { fireEvent.click(screen.getByRole('button', { name })); }
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
function clock() { return screen.getByLabelText('Active clock'); }
function row(name: string) { return screen.getAllByRole('listitem').find(item => within(item).queryByText(name))!; }

it('creates a configurable table with 2-8 players and sensible defaults', () => {
  render(<TableApp repository={new TableRepository(localStorage)} />);
  expect(screen.getByLabelText('Starting bank (minutes)')).toHaveValue(15);
  click('Remove player'); click('Remove player'); expect(screen.getByRole('button', { name: 'Remove player' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Player 1'), { target: { value: 'Sridev' } });
  fireEvent.change(screen.getByLabelText('Turns per bonus'), { target: { value: '3' } });
  click('Create game'); expect(clock()).toHaveTextContent('Sridev'); expect(row('Sridev')).toHaveTextContent('0 / 3');
  expect(screen.getByRole('button', { name: /Multiplayer/ })).toBeDisabled();
});
it('lets one operator finish both players and automatically starts the next turn', () => {
  setup(); click('Start game'); advance(2000); click('Finish turn'); click('Finish turn');
  expect(clock()).toHaveTextContent('NEUTRAL HANDOFF'); expect(row('A')).toHaveTextContent('1 completed');
  advance(5000); expect(clock()).toHaveTextContent('B'); expect(screen.getByRole('status')).toHaveTextContent('Turn 2');
  advance(1000); click('Finish turn'); advance(5000); expect(clock()).toHaveTextContent('A');
  expect(row('B')).toHaveTextContent('1 completed'); expect(screen.queryByRole('button', { name: 'Start my turn' })).not.toBeInTheDocument();
});
it('pauses and resumes the remaining handoff duration without charging banks', () => {
  setup(); click('Start game'); advance(2000); click('Finish turn'); advance(2000); click('Pause');
  expect(screen.getByLabelText('Handoff remaining')).toHaveTextContent('3'); advance(20000);
  expect(screen.getByLabelText('Handoff remaining')).toHaveTextContent('3'); click('Resume'); advance(3000);
  expect(clock()).toHaveTextContent('B'); expect(row('A')).toHaveTextContent('14:58'); expect(row('B')).toHaveTextContent('15:00');
});
it('shows milestone awards and permanent bullet fallback with automatic timeout handoff', () => {
  setup({ bankMs: 3000, milestone: 1, bonusMs: 1000, handoffMs: 1000, bulletMs: 2000 });
  click('Start game'); advance(1000); click('Finish turn'); expect(row('A')).toHaveTextContent('00:03');
  advance(4000); expect(row('B')).toHaveTextContent('BULLET'); expect(clock()).toHaveTextContent('NEUTRAL HANDOFF');
  advance(4000); expect(row('A')).toHaveTextContent('BULLET'); advance(1000); expect(clock()).toHaveTextContent('BULLET');
  advance(2000); expect(clock()).toHaveTextContent('NEUTRAL HANDOFF');
});
it('recovers elapsed time after refresh/backgrounding without a server', () => {
  const first = setup(); click('Start game'); advance(1000); click('Finish turn'); first.unmount();
  vi.setSystemTime(10000); render(<TableApp repository={first.repository} />);
  expect(clock()).toHaveTextContent('B'); expect(screen.getByLabelText('Time remaining')).toHaveTextContent('14:57');
  vi.setSystemTime(12000); fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByLabelText('Time remaining')).toHaveTextContent('14:55');
});
it('confirms reset, preserves a cancelled game, and separately confirms a new game', () => {
  setup(); click('Start game'); advance(2000); click('Reset game'); advance(10000); click('Keep game');
  expect(clock()).toHaveTextContent('14:58'); expect(screen.getByRole('status')).toHaveTextContent('Paused');
  click('Reset game'); click('Confirm reset'); expect(screen.getByRole('button', { name: 'Start game' })).toBeEnabled();
  expect(clock()).toHaveTextContent('15:00'); click('New game'); click('Keep game'); expect(clock()).toBeVisible();
  click('New game'); click('Confirm new game'); expect(screen.getByRole('button', { name: 'Create game' })).toBeVisible();
});
it('reports damaged persistence and failed saves without crashing', () => {
  localStorage.setItem('sarkar-table-v2', '{broken');
  render(<TableApp repository={new TableRepository(localStorage)} />); expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  click('Create game'); expect(screen.getByRole('alert')).toHaveTextContent('Saving is unavailable');
  click('Start game'); advance(1000); expect(clock()).toHaveTextContent('14:59'); vi.restoreAllMocks();
});

it('keeps a previous fixed/increment game available with its original rules', () => {
  new LocalGameRepository(localStorage).save(GameClock.create({ name: 'Previous game', names: ['A', 'B'], minutes: 20, incrementSeconds: 10 }));
  render(<TableApp repository={new TableRepository(localStorage)} />);
  click('Resume previous fixed / increment game');
  expect(screen.getByRole('heading', { name: 'Previous game' })).toBeVisible();
  click('Back to On Table'); expect(screen.getByRole('button', { name: 'Create game' })).toBeVisible();
});

it('relinquishes control and dismisses pending reset when another tab takes over', () => {
  let receive: ((event: { data: string }) => void) | null = null;
  class Channel {
    set onmessage(fn: (event: { data: string }) => void) { receive = fn; }
    postMessage() {} close() {}
  }
  vi.stubGlobal('BroadcastChannel', Channel);
  setup(); click('Start game'); click('Reset game');
  act(() => { receive!({ data: 'take-control' }); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Open in another tab' })).toBeVisible();
  click('Use this tab'); expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible();
});
