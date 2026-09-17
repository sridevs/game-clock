export function formatTime(ms: number, remaining = true) {
  const seconds = Math.max(0, remaining ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const parts = [Math.floor(seconds / 60), seconds % 60];
  return parts.map(value => String(value).padStart(2, '0')).join(':');
}
