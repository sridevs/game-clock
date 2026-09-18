import { ArrowRight, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { RoomClockView } from '../domain/RoomClock';
import { formatTime } from './formatTime';

interface Props { view: RoomClockView; onStart(): void; onFinish(): void; onPause(): void; onResume(): void; onReset(): void; onNew(): void }
export function TableBoard({ view, onStart, onFinish, onPause, onResume, onReset, onNew }: Props) {
  const active = view.players[view.activeIndex];
  const handoff = view.phase === 'handoff';
  const next = view.players[(view.activeIndex + 1) % view.players.length];
  const phase = view.phase === 'ready' ? 'Ready' : view.paused ? (handoff ? 'Handoff paused' : 'Paused') : handoff ? 'Handoff' : 'Running';
  return <section className="stack table-board">
    <div className="row"><h1 className="game-title">{view.name}</h1><span className="table-badge">ON TABLE</span></div>
    <div className="row muted"><span role="status">Turn {view.turn} · {phase}</span><span>Total elapsed {formatTime(view.players.reduce((n, p) => n + p.elapsedMs, 0), false)}</span></div>
    <div className={`table-clock ${handoff ? 'handoff' : active.tone}`} aria-label="Active clock">
      <span className="clock-mode">{handoff ? 'NEUTRAL HANDOFF' : active.bullet ? <><span className="bullet-motif" aria-hidden="true">● ● ●</span> BULLET</> : active.tone === 'red' ? 'LOW BANK' : active.tone === 'amber' ? 'BANK CAUTION' : 'TIME BANK'}</span>
      <h2 className="player-name">{handoff ? `Next: ${next.name}` : active.name}</h2>
      <span className="digits" aria-label={handoff ? 'Handoff remaining' : 'Time remaining'}>{handoff ? Math.ceil(view.remainingMs / 1000) : formatTime(active.remainingMs)}</span>
      <span>{handoff ? (view.paused ? 'Paused' : 'Next turn begins automatically') : `${formatTime(active.elapsedMs, false)} elapsed`}</span>
      {view.phase === 'ready' ? <button className="primary finish-turn" onClick={onStart}><Play size={22} /> Start game</button> :
        <button className="primary finish-turn" onClick={onFinish} disabled={handoff || view.paused}>{handoff ? <Timer size={22} /> : <ArrowRight size={22} />} Finish turn</button>}
    </div>
    <div className="actions"><button className="primary" disabled={view.phase === 'ready'} onClick={view.paused ? onResume : onPause}>{view.paused ? <Play size={20} /> : <Pause size={20} />}{view.paused ? 'Resume' : 'Pause'}</button><button onClick={onReset}><RotateCcw size={18} /> Reset game</button></div>
    <h2>At the table</h2>
    <ol className="table-players">{view.players.map((player, i) => <li key={i} aria-current={view.activeIndex === i ? 'true' : undefined} className={`${player.tone} ${view.activeIndex === i ? 'active' : ''}`}>
      <span className="number">{i + 1}</span><div className="player-details"><strong>{player.name}</strong><small>{player.bullet ? 'BULLET · No more bonuses' : `${player.bonusProgress} / ${view.settings.milestone} turns toward +${formatTime(view.settings.bonusMs)}`}</small><small>{player.completedTurns} completed · {formatTime(player.elapsedMs, false)} elapsed</small></div>
      <div className="player-bank"><strong>{player.bullet && (i !== view.activeIndex || handoff) ? formatTime(view.settings.bulletMs) : formatTime(player.remainingMs)}</strong><small>{player.bullet ? (i === view.activeIndex && !handoff ? 'bullet remaining' : 'next bullet turn') : player.tone === 'red' ? 'Low bank' : player.tone === 'amber' ? 'Caution' : 'Bank'}</small></div>
    </li>)}</ol>
    <button className="new-game" onClick={onNew}>New game</button>
  </section>;
}
