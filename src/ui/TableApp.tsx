import { useEffect, useRef, useState } from 'react';
import { RoomClock, type RoomConfig } from '../domain/RoomClock';
import { TableRepository } from '../storage/TableRepository';
import { LocalGameRepository } from '../storage/GameRepository';
import { App } from './App';
import { TableSetup } from './TableSetup';
import { TableBoard } from './TableBoard';
import { ResetDialog } from './ResetDialog';
import './table.css';

interface Props { repository: TableRepository; now?: () => number }
export function TableApp({ repository, now = Date.now }: Props) {
  const [initial] = useState(() => { try { return { game: repository.load(), error: '' }; } catch { return { game: null, error: 'The saved table could not be loaded. Create a new game to continue.' }; } });
  const [game, setGame] = useState(initial.game);
  const [view, setView] = useState(() => initial.game?.view());
  const [error, setError] = useState(initial.error);
  const [confirm, setConfirm] = useState<'reset' | 'new' | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [hasLegacy] = useState(() => { try { return !!new LocalGameRepository(localStorage).load(); } catch { return false; } });
  const [otherTab, setOtherTab] = useState(false);
  const lock = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastFinish = useRef(-Infinity);
  const [saveWarning, setSaveWarning] = useState('');
  function persist(clock: RoomClock) {
    try { repository.save(clock); setSaveWarning(''); }
    catch { setSaveWarning('Saving is unavailable. Keep this tab open; refresh may lose this game.'); }
  }
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bus = new BroadcastChannel('sarkar-table-owner'); channel.current = bus;
    // A newly opened table asks an existing table to relinquish control.
    bus.onmessage = event => { if (event.data === 'take-control') { lock.current = true; setOtherTab(true); setConfirm(null); } };
    bus.postMessage('take-control');
    return () => { bus.close(); channel.current = null; };
  }, []);
  useEffect(() => {
    if (!game || otherTab || legacy) return;
    const tick = () => { if (lock.current) return; const transitioned = game.advance(now()); setView(game.view()); if (transitioned) persist(game); };
    tick();
    const timer = window.setInterval(tick, 100);
    const save = () => { if (!lock.current) { game.advance(now()); persist(game); setView(game.view()); } };
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', save);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', save); };
  }, [game, now, otherTab, legacy]);
  useEffect(() => { if (confirm === 'new') dialog.current?.showModal(); }, [confirm]);
  function act(command: (clock: RoomClock) => void) {
    if (!game || lock.current) return;
    try { command(game); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update clock'); }
    persist(game); setView(game.view());
  }
  function create(config: RoomConfig) {
    if (lock.current) return;
    try { const clock = RoomClock.create(config, now()); persist(clock); setGame(clock); setView(clock.view()); lastFinish.current = -Infinity; setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create game'); }
  }
  function finish() {
    if (now() - lastFinish.current < 500) return;
    lastFinish.current = now(); act(clock => clock.finish(now()));
  }
  function ask(action: 'reset' | 'new') { if (game && game.view().phase !== 'ready' && !game.view().paused) act(clock => clock.pause(now())); setConfirm(action); }
  function newGame() {
    if (lock.current) return;
    try { repository.clear(); setGame(null); setView(undefined); setConfirm(null); setError(''); setSaveWarning(''); } catch { setError('Could not clear the saved game.'); }
  }
  function takeControl() {
    try { const saved = repository.load(); channel.current?.postMessage('take-control'); lock.current = false; setOtherTab(false); setGame(saved); setView(saved?.view()); }
    catch { setError('Could not restore the table.'); }
  }
  if (legacy) return <><div className="legacy-nav"><button onClick={() => setLegacy(false)}>Back to On Table</button></div><App repository={new LocalGameRepository(localStorage)} /></>;
  return <main className="table-app">
    <header><span className="logo">S</span><span>SARKAR <span className="muted">/ GAME CLOCK</span></span></header>
    <nav className="table-modes" aria-label="Game mode"><button aria-current="page">On Table</button><button disabled title="Multiplayer is coming in the next update">Multiplayer <small>Coming next</small></button></nav>
    {error && <p role="alert">{error}</p>}{saveWarning && <p role="alert">{saveWarning}</p>}
    {otherTab ? <section className="stack"><h1>Open in another tab</h1><button className="primary" onClick={takeControl}>Use this tab</button></section> : game && view ?
      <TableBoard view={view} onStart={() => act(clock => clock.start(now()))} onFinish={finish} onPause={() => act(clock => clock.pause(now()))} onResume={() => act(clock => clock.resume(now()))} onReset={() => ask('reset')} onNew={() => ask('new')} /> : <TableSetup onCreate={create} />}
    {!game && !otherTab && hasLegacy && <button className="legacy-resume" onClick={() => setLegacy(true)}>Resume previous fixed / increment game</button>}
    {confirm === 'reset' && <ResetDialog onCancel={() => setConfirm(null)} onConfirm={() => { act(clock => clock.reset(now())); setConfirm(null); }} />}
    {confirm === 'new' && <dialog ref={dialog} aria-labelledby="new-title" onCancel={e => { e.preventDefault(); setConfirm(null); }}><h2 id="new-title">Leave this game?</h2><p>Current times and turns will be cleared.</p><div className="actions"><button autoFocus onClick={() => setConfirm(null)}>Keep game</button><button className="danger" onClick={newGame}>Confirm new game</button></div></dialog>}
    <footer>Made for the table.</footer>
  </main>;
}
