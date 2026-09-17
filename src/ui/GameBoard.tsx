import { GameClock } from '../domain/GameClock';
import { formatTime } from './formatTime';

interface Props {
  game: GameClock; onToggle(): void; onTurn(): void; onReset(): void;
}

export function GameBoard({ game, onToggle, onTurn, onReset }: Props) {
  return <section className="stack">
    <div className="row"><h1 className="game-title">{game.name}</h1><span className="badge">{game.incrementMs ? `+${game.incrementMs / 1000}s / turn` : 'Fixed budget'}</span></div>
    <div className="row muted"><span>Turn {game.turn} · {game.running ? 'Running' : 'Paused'}</span><span>Game elapsed {formatTime(game.elapsedMs, false)}</span></div>
    <button className="clock" onClick={onTurn} disabled={!game.running && !game.active.expired} aria-label={game.active.expired ? 'Pass expired player' : 'End turn'}>
      <span className="eyebrow">Current player</span>
      <strong className="player-name">{game.active.name}</strong>
      <span className="digits">{formatTime(game.active.remainingMs)}</span>
      <span>remaining · {formatTime(game.active.elapsedMs, false)} elapsed</span>
      <span className="hint">{game.active.expired ? 'Time is up · tap to pass' : game.running ? 'Tap to end turn →' : 'Press start to play'}</span>
    </button>
    <div className="actions"><button className="primary" onClick={onToggle} disabled={game.active.expired}>{game.running ? 'Pause' : 'Start / resume'}</button><button onClick={onReset}>Reset game</button></div>
    {game.active.expired && <p role="status">{game.active.name} is out of time. Pass to the next player, then resume when ready.</p>}
    <h2>At the table <small>Fixed turn order</small></h2>
    <ol className="players">{game.players.map((player, index) => <li key={index} className={index === game.activeIndex ? 'active' : ''} aria-current={index === game.activeIndex ? 'true' : undefined}>
      <span className="number">{index + 1}</span><strong>{player.name}</strong>
      <span className="player-time">{formatTime(player.remainingMs)}<small>{formatTime(player.elapsedMs, false)} elapsed</small></span>
    </li>)}</ol>
  </section>;
}
