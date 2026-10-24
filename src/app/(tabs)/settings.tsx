import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Switch, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { CURRICULUM_VERSION } from '@/curriculum';
import { readBackupText, shareBackupJson } from '@/backup/files';
import { localDateISO } from '@/engine/dates';
import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Screen } from '@/ui/components';

export default function SettingsScreen() {
  const academy = useAcademy();
  const { snapshot, permission, alarmsAllowed, colors } = academy;
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!snapshot) return null;
  const reminders = snapshot.notifications;
  const settings = snapshot.settings;
  const sameTime =
    reminders.morningHour === reminders.eveningHour && reminders.morningMinute === reminders.eveningMinute;

  async function saveReminders(next: Partial<typeof reminders>) {
    const merged = { ...reminders, ...next, updatedAt: new Date().toISOString() };
    if (merged.morningHour === merged.eveningHour && merged.morningMinute === merged.eveningMinute) {
      setMessage('Choose different times for the morning and evening reminders.');
      return;
    }
    setMessage(null);
    await academy.updateReminders(merged);
  }

  return (
    <Screen tab>
      <AppText role="display">Settings</AppText>
      <Card>
        <AppText role="title">Reminders</AppText>
        <AppText role="small">
          Notification permission: {permission}. The switches save a time on this phone. Android delivers them only after notifications are allowed, and only at that minute after alarms are allowed too.
        </AppText>
        <ReminderRow
          label="Morning"
          enabled={reminders.morningEnabled}
          hour={reminders.morningHour}
          minute={reminders.morningMinute}
          onEnabled={(morningEnabled) => saveReminders({ morningEnabled })}
          onChange={(morningHour, morningMinute) => saveReminders({ morningHour, morningMinute })}
        />
        <ReminderRow
          label="Evening"
          enabled={reminders.eveningEnabled}
          hour={reminders.eveningHour}
          minute={reminders.eveningMinute}
          onEnabled={(eveningEnabled) => saveReminders({ eveningEnabled })}
          onChange={(eveningHour, eveningMinute) => saveReminders({ eveningHour, eveningMinute })}
        />
        {sameTime ? <AppText color={colors.danger}>Morning and evening need different times.</AppText> : null}
        {permission !== 'granted' ? (
          <Button
            label={permission === 'denied' ? 'Notifications blocked — open settings' : 'Allow notifications'}
            onPress={async () => {
              if (permission === 'denied') {
                await Linking.openSettings();
                return;
              }
              const next = await academy.allowReminders();
              setMessage(
                next === 'granted'
                  ? 'Notifications are allowed. Allow alarms on the next screen if Android asks, then return here.'
                  : 'Reminders stay off until notification permission is allowed.',
              );
            }}
          />
        ) : (
          <>
            {alarmsAllowed ? (
              <AppText role="small">On-time alarms are allowed. Morning and evening reminders are scheduled for the times above.</AppText>
            ) : (
              <Button
                label="Allow on-time alarms"
                onPress={async () => {
                  const allowed = await academy.allowExactAlarms();
                  setMessage(
                    allowed
                      ? 'Alarms are allowed. The reminders are scheduled for the times above.'
                      : 'Android is still allowed to delay reminders until on-time alarms are enabled.',
                  );
                }}
              />
            )}
            <Button
              label="Send a test reminder"
              tone="secondary"
              onPress={async () => {
                try {
                  await academy.testReminder();
                  setMessage('A test notification should appear within a few seconds.');
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'The test reminder could not be scheduled.');
                }
              }}
            />
          </>
        )}
      </Card>
      <Card>
        <AppText role="title">Reading</AppText>
        <Choice
          label="Theme"
          value={settings.theme}
          options={['system', 'light', 'dark'] as const}
          onChange={(theme) => academy.updateSettings({ ...settings, theme })}
        />
        <Choice
          label="Text size"
          value={settings.fontScale}
          options={['compact', 'default', 'large'] as const}
          onChange={(fontScale) => academy.updateSettings({ ...settings, fontScale })}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 48 }}>
          <View style={{ flex: 1 }}>
            <AppText>Reduce motion</AppText>
          </View>
          <Switch
            accessibilityLabel="Reduce motion"
            value={settings.reduceMotion}
            onValueChange={(reduceMotion) => academy.updateSettings({ ...settings, reduceMotion })}
          />
        </View>
      </Card>
      <Card>
        <AppText role="title">Backup</AppText>
        <AppText role="small">
          Answers and progress live in a SQLite database on this device. Uninstalling the app or clearing its storage deletes them unless you export a backup. Import replaces the learning history on this device after the file is checked. Nothing is uploaded.
        </AppText>
        <AppText role="small">Curriculum {CURRICULUM_VERSION}. Stored version {snapshot.curriculumVersion || 'not recorded yet'}.</AppText>
        <Button
          label="Export backup"
          onPress={async () => {
            try {
              await shareBackupJson(await academy.exportJson());
              setMessage('The share sheet is ready. Keep the file somewhere you control.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Export failed.');
            }
          }}
        />
        <Button
          label="Import backup"
          tone="secondary"
          onPress={async () => {
            const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (picked.canceled) return;
            try {
              const asset = picked.assets[0];
              const text = await readBackupText(asset.uri, asset.size);
              await academy.restoreJson(text);
              setMessage('Backup restored. The bundled curriculum stays the current one. Your answers were replaced with the file.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Import failed.');
            }
          }}
        />
      </Card>
      <Card>
        <AppText role="title">Reset progress</AppText>
        <AppText role="small">This deletes answers, mastery, notes, and activity on this device. Reminder times and reading settings stay.</AppText>
        {confirmReset ? (
          <Button
            label="Delete learning history"
            tone="danger"
            onPress={async () => {
              await academy.clearProgress();
              setConfirmReset(false);
              setMessage('Learning history was deleted from this device.');
            }}
          />
        ) : (
          <Button label="Reset progress" tone="secondary" onPress={() => setConfirmReset(true)} />
        )}
      </Card>
      <Button label="Resources" tone="secondary" onPress={() => router.push('/resources')} />
      {message ? <AppText>{message}</AppText> : null}
      <AppText role="small">Today is {localDateISO(new Date())}. Storage is not encrypted by this app.</AppText>
    </Screen>
  );
}

function ReminderRow({
  label,
  enabled,
  hour,
  minute,
  onEnabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  onEnabled: (enabled: boolean) => void;
  onChange: (hour: number, minute: number) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
        <View style={{ flex: 1 }}>
          <AppText>{label}</AppText>
          <AppText role="small">{formatClock(hour, minute)}</AppText>
        </View>
        <Switch accessibilityLabel={`${label} reminder`} value={enabled} onValueChange={onEnabled} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Hour −" tone="secondary" onPress={() => onChange((hour + 23) % 24, minute)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Hour +" tone="secondary" onPress={() => onChange((hour + 1) % 24, minute)} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="5 min −" tone="secondary" onPress={() => shiftMinute(hour, minute, -5, onChange)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="5 min +" tone="secondary" onPress={() => shiftMinute(hour, minute, 5, onChange)} />
        </View>
      </View>
    </View>
  );
}

function shiftMinute(hour: number, minute: number, delta: number, onChange: (hour: number, minute: number) => void) {
  const total = (hour * 60 + minute + delta + 24 * 60) % (24 * 60);
  onChange(Math.floor(total / 60), total % 60);
}

function formatClock(hour: number, minute: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText role="label">{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => (
          <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)}>
            <View style={{ paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' }}>
              <AppText color={value === option ? undefined : undefined} role="body">
                {value === option ? `● ${option}` : option}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
