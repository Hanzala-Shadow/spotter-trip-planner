export function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}
export function exactTime(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}${s % 60 ? `:${String(s % 60).padStart(2, '0')}` : ''}`;
}
export function time(iso: string): string {
  return iso.slice(11, 16);
}
export function dateLabel(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
export function offsetLabel(minutes: number): string {
  return `UTC${minutes < 0 ? '−' : '+'}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0')}:${String(Math.abs(minutes) % 60).padStart(2, '0')}`;
}
export const kindLabel: Record<string, string> = {
  drive: 'Driving',
  pickup: 'Pickup',
  dropoff: 'Dropoff',
  break: 'Driving break',
  daily_rest: 'Daily rest',
  cycle_restart: 'Cycle restart',
  fuel: 'Fuel stop',
  assumed_off_duty: 'Off duty',
};
