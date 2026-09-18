import { useState, type FormEvent } from 'react';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { defaultSettings, type RoomConfig } from '../domain/RoomClock';

export function TableSetup({ onCreate }: { onCreate(config: RoomConfig): void }) {
  const [names, setNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    onCreate({ name: String(form.get('game')), names, settings: {
      bankMs: Number(form.get('bank')) * 60_000, milestone: Number(form.get('milestone')),
      bonusMs: Number(form.get('bonus')) * 60_000, bulletMs: Number(form.get('bullet')) * 1000,
      handoffMs: Number(form.get('handoff')) * 1000,
    } });
  }
  function resize(count: number) { setNames(previous => Array.from({ length: count }, (_, i) => previous[i] ?? `Player ${i + 1}`)); }
  return <section className="table-setup">
    <div className="section-heading"><p className="eyebrow">ON TABLE</p><h1>Set the table.</h1></div>
    <form className="stack" onSubmit={submit}>
      <label>Game name<input name="game" defaultValue="Sarkar night" maxLength={80} required /></label>
      <fieldset><legend>Players</legend><div className="row player-count"><span>{names.length} players</span><div className="stepper">
        <button type="button" title="Remove player" aria-label="Remove player" disabled={names.length === 2} onClick={() => resize(names.length - 1)}><Minus size={18} /></button>
        <button type="button" title="Add player" aria-label="Add player" disabled={names.length === 8} onClick={() => resize(names.length + 1)}><Plus size={18} /></button>
      </div></div><div className="names">{names.map((name, i) => <label key={i}>Player {i + 1}<input required maxLength={40} value={name} onChange={e => setNames(names.map((n, j) => i === j ? e.target.value : n))} /></label>)}</div></fieldset>
      <fieldset className="time-settings"><legend>Clock settings</legend><div className="names">
        <label>Starting bank (minutes)<input name="bank" type="number" min="1" max="600" step="1" defaultValue={defaultSettings.bankMs / 60_000} required /></label>
        <label>Turns per bonus<input name="milestone" type="number" min="1" max="100" defaultValue={defaultSettings.milestone} required /></label>
        <label>Milestone bonus (minutes)<input name="bonus" type="number" min="0" max="60" step="0.5" defaultValue={defaultSettings.bonusMs / 60_000} required /></label>
        <label>Bullet turn (seconds)<input name="bullet" type="number" min="1" max="3600" defaultValue={defaultSettings.bulletMs / 1000} required /></label>
        <label>Handoff (seconds)<input name="handoff" type="number" min="1" max="300" defaultValue={defaultSettings.handoffMs / 1000} required /></label>
      </div></fieldset>
      <button className="primary create-game" type="submit">Create game <ArrowRight size={20} /></button>
    </form>
  </section>;
}
