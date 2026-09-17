import { useEffect, useReducer, useRef, useState } from 'react';
import { GameClock, type GameConfig } from '../domain/GameClock';
import type { GameRepository } from '../storage/GameRepository';
import { Setup } from './Setup';
import { GameBoard } from './GameBoard';
import { ResetDialog } from './ResetDialog';

interface Props { repository: GameRepository; now?: () => number }

export function App({ repository, now = Date.now }: Props) {
  const [game, setGame] = useState(() => repository.load());
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [, refresh] = useReducer(n => n + 1, 0);
  const lastTurn = useRef(-Infinity);

  function persist(clock: GameClock) {
    try { repository.save(clock); } catch { setError('This browser cannot save the game. Keep this tab open.'); }
  }

  useEffect(() => {
    if (!game) return;
    const tick = () => { game.tick(now()); refresh(); };
    tick();
    const timer = window.setInterval(tick, 100);
    const save = () => { game.tick(now()); persist(game); };
    window.addEventListener('pagehide', save);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', save); };
  }, [game, now]);

  function act(action: (clock: GameClock) => void) {
    if (!game) return;
    action(game); persist(game); refresh();
  }

  function create(config: GameConfig) {
    try { const clock = GameClock.create(config); persist(clock); setGame(clock); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create game'); }
  }

  function endTurn() {
    if (now() - lastTurn.current < 500) return;
    lastTurn.current = now();
    act(clock => clock.completeTurn(now()));
  }

  function reset() {
    try { repository.clear(); setGame(null); setResetting(false); lastTurn.current = -Infinity; }
    catch { setError('Could not clear the saved game. Please try again.'); }
  }

  return <main>
    <header><span className="logo">S</span><span>SARKAR <span className="muted">/ GAME CLOCK</span></span></header>
    {error && <p role="alert">{error}</p>}
    {game ? <GameBoard view={game.view()} onTurn={endTurn}
      onToggle={() => act(clock => clock.toggle(now()))}
      onReset={() => { act(clock => clock.pause(now())); setResetting(true); }} /> : <Setup onCreate={create} />}
    {resetting && <ResetDialog onCancel={() => setResetting(false)} onConfirm={reset} />}
    <footer>Made for the table. No accounts. No tracking.</footer>
  </main>;
}
