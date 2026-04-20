export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 90 * 1000) return 'just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function formatMoney(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

export function formatBig(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}
