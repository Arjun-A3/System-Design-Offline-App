export const MORNING_NOTIFICATION_ID = 'sysdapp.reminder.morning';
export const EVENING_NOTIFICATION_ID = 'sysdapp.reminder.evening';
export const TEST_NOTIFICATION_ID = 'sysdapp.reminder.test';
export const NOTIFICATION_CHANNEL_ID = 'learning-reminders-v2';

export type ReminderSlot = 'morning' | 'evening';

export type ReminderPreferences = {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
};

export type ScheduledReminder = {
  identifier: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  channelId: string;
  slot: ReminderSlot;
};

export type ExistingReminder = {
  identifier: string;
  hour?: number;
  minute?: number;
  slot?: string;
};

export const DEFAULT_REMINDERS: ReminderPreferences = {
  morningEnabled: true,
  morningHour: 8,
  morningMinute: 0,
  eveningEnabled: true,
  eveningHour: 20,
  eveningMinute: 0,
};

export function validClock(hour: number, minute: number): boolean {
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function sameClock(prefs: ReminderPreferences): boolean {
  return prefs.morningHour === prefs.eveningHour && prefs.morningMinute === prefs.eveningMinute;
}

export function desiredReminders(
  prefs: ReminderPreferences,
  copy: { morningBody: string; eveningBody: string },
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  if (prefs.morningEnabled) {
    reminders.push({
      identifier: MORNING_NOTIFICATION_ID,
      title: "Today's system design challenge is ready.",
      body: copy.morningBody,
      hour: prefs.morningHour,
      minute: prefs.morningMinute,
      channelId: NOTIFICATION_CHANNEL_ID,
      slot: 'morning',
    });
  }
  if (prefs.eveningEnabled) {
    reminders.push({
      identifier: EVENING_NOTIFICATION_ID,
      title: "Time to apply today's concept.",
      body: copy.eveningBody,
      hour: prefs.eveningHour,
      minute: prefs.eveningMinute,
      channelId: NOTIFICATION_CHANNEL_ID,
      slot: 'evening',
    });
  }
  return reminders;
}

function stableIdForSlot(slot: string): string | null {
  if (slot === 'morning') return MORNING_NOTIFICATION_ID;
  if (slot === 'evening') return EVENING_NOTIFICATION_ID;
  return null;
}

function isManaged(item: ExistingReminder): boolean {
  if (item.identifier === TEST_NOTIFICATION_ID) return false;
  if (item.identifier === MORNING_NOTIFICATION_ID || item.identifier === EVENING_NOTIFICATION_ID) return true;
  if (item.identifier.startsWith('sysdapp.reminder.')) return true;
  return item.slot === 'morning' || item.slot === 'evening';
}

/**
 * Cancels obsolete reminders before scheduling replacements.
 * Stable ids are reused. A timezone change forces a reschedule even when the clock time matches.
 * Denied permission cancels learning reminders and schedules nothing.
 */
export function reconcileReminders(
  existing: readonly ExistingReminder[],
  desired: readonly ScheduledReminder[],
  options: { permissionGranted: boolean; forceReschedule: boolean },
): { cancel: string[]; schedule: ScheduledReminder[] } {
  const cancel = new Set<string>();
  const schedule: ScheduledReminder[] = [];
  const desiredById = new Map(desired.map((item) => [item.identifier, item]));

  if (!options.permissionGranted) {
    for (const item of existing) {
      if (isManaged(item)) cancel.add(item.identifier);
    }
    cancel.add(MORNING_NOTIFICATION_ID);
    cancel.add(EVENING_NOTIFICATION_ID);
    return { cancel: [...cancel], schedule: [] };
  }

  for (const item of existing) {
    if (!isManaged(item)) continue;
    const stable = item.slot ? stableIdForSlot(item.slot) : null;
    if (stable && item.identifier !== stable) {
      cancel.add(item.identifier);
      continue;
    }
    const wanted = desiredById.get(item.identifier);
    if (!wanted) {
      cancel.add(item.identifier);
      continue;
    }
    const sameTime = item.hour === wanted.hour && item.minute === wanted.minute;
    if (!sameTime || options.forceReschedule) {
      cancel.add(item.identifier);
      schedule.push(wanted);
    }
  }

  for (const item of desired) {
    const alreadyListed = schedule.some((scheduled) => scheduled.identifier === item.identifier);
    const kept = existing.some((current) => {
      if (current.identifier !== item.identifier) return false;
      return current.hour === item.hour && current.minute === item.minute && !options.forceReschedule;
    });
    if (!alreadyListed && !kept) schedule.push(item);
  }

  return { cancel: [...cancel], schedule };
}
