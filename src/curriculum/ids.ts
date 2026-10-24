import type { SessionSlot } from './types';

export function padDay(day: number): string {
  return String(day).padStart(3, '0');
}

export function dayId(day: number): string {
  return `day.${padDay(day)}`;
}

export function sessionId(day: number, slot: SessionSlot): string {
  return `day.${padDay(day)}.${slot}`;
}

export function sessionSortKey(dayNumber: number, slot: SessionSlot): number {
  return dayNumber * 2 + (slot === 'evening' ? 1 : 0);
}
