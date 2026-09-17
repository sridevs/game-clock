import { useState, type FormEvent } from 'react';
import type { GameConfig } from '../domain/GameClock';

export function Setup({ onCreate }: { onCreate(config: GameConfig): void }) {
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  const [increment, setIncrement] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreate({ name: String(data.get('game')), names, minutes: Number(data.get('minutes')),
      incrementSeconds: increment ? Number(data.get('increment')) : 0 });
  }

  function resize(count: number) {
    setNames(previous => Array.from({ length: count }, (_, i) => previous[i] ?? `Player ${i + 1}`));
  }

  return <section>
    <p className="eyebrow">A little pressure. A better game.</p>
    <h1>Set the table.</h1>
    <p className="muted">One device, everyone’s turn. Your game stays in this browser.</p>
    <form onSubmit={submit} className="panel stack">
      <label>Game name<input name="game" defaultValue="Sarkar night" maxLength={60} required /></label>
      <label>Number of players<select value={names.length} onChange={e => resize(Number(e.target.value))}>
        {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>{n}</option>)}
      </select></label>
      <div className="names">{names.map((name, i) => <label key={i}>Player {i + 1}
        <input value={name} maxLength={24} required onChange={e => setNames(names.map((n, j) => j === i ? e.target.value : n))} />
      </label>)}</div>
      <fieldset><legend>Clock mode</legend><div className="modes">
        <label><input type="radio" name="mode" checked={!increment} onChange={() => setIncrement(false)} /> Fixed budget</label>
        <label><input type="radio" name="mode" checked={increment} onChange={() => setIncrement(true)} /> Budget + increment</label>
      </div></fieldset>
      <label>Starting minutes per player<input name="minutes" type="number" min="1" max="600" defaultValue="20" required /></label>
      {increment && <label>Increment seconds per completed turn<input name="increment" type="number" min="1" max="600" defaultValue="10" required /></label>}
      <p className="muted">Unused time carries forward. {increment ? 'The outgoing player receives the increment once per completed turn.' : 'Only the current player’s clock runs.'}</p>
      <button className="primary">Create game</button>
    </form>
  </section>;
}
