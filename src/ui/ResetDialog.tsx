import { useEffect, useRef } from 'react';

export function ResetDialog({ onCancel, onConfirm }: { onCancel(): void; onConfirm(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="reset-title" onCancel={e => { e.preventDefault(); onCancel(); }}>
    <h2 id="reset-title">Reset this game?</h2><p>All times and turns will be cleared. This cannot be undone.</p>
    <div className="actions"><button autoFocus onClick={onCancel}>Keep game</button><button className="danger" onClick={onConfirm}>Confirm reset</button></div>
  </dialog>;
}
