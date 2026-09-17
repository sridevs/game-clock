import type { GameView } from '../domain/GameClock';
import { formatTime } from './formatTime';

interface Props {
  view: GameView; onToggle(): void; onTurn(): void; onReset(): void;
}

export function GameBoard({ view, onToggle, onTurn, onReset }: Props) {
  return <section className="stack">
    <div className="row"><h1 className="game-title">{view.name}</h1><span className="badge">{view.incrementMs ? `+${view.incrementMs / 1000}s / turn` : 'Fixed budget'}</span></div>
    <div className="row muted"><span>Turn {view.turn} · {view.running ? 'Running' : 'Paused'}</span><span>Game elapsed {formatTime(view.elapsedMs, false)}</span></div>
    <button className="clock" onClick={onTurn} disabled={!view.canEndTurn} aria-label={view.expired ? 'Pass expired player' : 'End turn'}>
      <span className="eyebrow">Current player</span>
      <strong className="player-name">{view.activePlayer.name}</strong>
      <span className="digits">{formatTime(view.activePlayer.remainingMs)}</span>
      <span>remaining · {formatTime(view.activePlayer.elapsedMs, false)} elapsed</span>
      <span className="hint">{view.expired ? 'Time is up · tap to pass' : view.running ? 'Tap to end turn →' : 'Press start to play'}</span>
    </button>
    <div className="actions"><button className="primary" onClick={onToggle} disabled={!view.canToggle}>{view.running ? 'Pause' : 'Start / resume'}</button><button onClick={onReset}>Reset game</button></div>
    {view.expired && <p role="status">{view.activePlayer.name} is out of time. Pass to the next player, then resume when ready.</p>}
    <h2>At the table <small>Fixed turn order</small></h2>
    <ol className="players">{view.players.map((player, index) => <li key={index} className={index === view.activeIndex ? 'active' : ''} aria-current={index === view.activeIndex ? 'true' : undefined}>
      <span className="number">{index + 1}</span><strong>{player.name}</strong>
      <span className="player-time">{formatTime(player.remainingMs)}<small>{formatTime(player.elapsedMs, false)} elapsed</small></span>
    </li>)}</ol>
  </section>;
}
