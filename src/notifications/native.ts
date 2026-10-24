import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import {
  getExactAlarmPermissionsAsync,
  getPermissionsAsync,
  requestExactAlarmPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  SchedulableTriggerInputTypes,
  type NotificationRequest,
} from 'expo-notifications/build/Notifications.types';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { Platform } from 'react-native';

import {
  NOTIFICATION_CHANNEL_ID,
  TEST_NOTIFICATION_ID,
  desiredReminders,
  reconcileReminders,
  type ExistingReminder,
  type ReminderPreferences,
} from './plan';

// The package entry also loads ExpoTopicSubscriptionModule, a push-topic API that
// current Expo Go builds do not ship. These local-notification imports avoid that crash.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Learning reminders',
    importance: AndroidImportance.HIGH,
    description: 'Morning and evening study reminders scheduled on this device.',
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function readExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const status = await getExactAlarmPermissionsAsync();
    return status.granted;
  } catch {
    return false;
  }
}

export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const current = await getExactAlarmPermissionsAsync();
    if (current.granted) return true;
    const next = await requestExactAlarmPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

export async function readNotificationPermission(): Promise<PermissionState> {
  try {
    const settings = await getPermissionsAsync();
    if (settings.granted) return 'granted';
    if (settings.status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  try {
    const settings = await requestPermissionsAsync();
    if (settings.granted) return 'granted';
    if (settings.status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function reconcileScheduledReminders(input: {
  preferences: ReminderPreferences;
  morningBody: string;
  eveningBody: string;
  permission: PermissionState;
  forceReschedule: boolean;
}): Promise<void> {
  await ensureNotificationChannel();
  const desired =
    input.permission === 'granted'
      ? desiredReminders(input.preferences, {
          morningBody: input.morningBody,
          eveningBody: input.eveningBody,
        })
      : [];
  const existing = await getAllScheduledNotificationsAsync();
  const plan = reconcileReminders(
    existing.map(toExistingReminder),
    desired,
    { permissionGranted: input.permission === 'granted', forceReschedule: input.forceReschedule },
  );
  for (const identifier of plan.cancel) {
    await cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  }
  for (const reminder of plan.schedule) {
    await scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { slot: reminder.slot },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: reminder.channelId,
      },
    });
  }
}

export async function scheduleTestReminder(): Promise<void> {
  await ensureNotificationChannel();
  await cancelScheduledNotificationAsync(TEST_NOTIFICATION_ID).catch(() => undefined);
  await scheduleNotificationAsync({
    identifier: TEST_NOTIFICATION_ID,
    content: {
      title: 'System Design Academy',
      body: 'This is a local test reminder. It was scheduled on this device.',
      data: { slot: 'test' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

function toExistingReminder(request: NotificationRequest): ExistingReminder {
  const trigger = request.trigger;
  let hour: number | undefined;
  let minute: number | undefined;
  if (trigger && typeof trigger === 'object') {
    if ('hour' in trigger && typeof trigger.hour === 'number') hour = trigger.hour;
    if ('minute' in trigger && typeof trigger.minute === 'number') minute = trigger.minute;
    if ('dateComponents' in trigger && trigger.dateComponents && typeof trigger.dateComponents === 'object') {
      const components = trigger.dateComponents;
      if ('hour' in components && typeof components.hour === 'number') hour = components.hour;
      if ('minute' in components && typeof components.minute === 'number') minute = components.minute;
    }
  }
  const data = request.content.data;
  const slot = data && typeof data === 'object' && 'slot' in data ? String(data.slot) : undefined;
  return { identifier: request.identifier, hour, minute, slot };
}
