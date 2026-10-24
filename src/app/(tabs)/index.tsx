import { router } from 'expo-router';
import { View } from 'react-native';

import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Pill, Screen } from '@/ui/components';

const statusLabel = {
  not_started: 'Not started',
  in_progress: 'In progress',
  postponed: 'Postponed',
  completed: 'Completed',
  planned: 'Planned',
} as const;

export default function HomeScreen() {
  const { home, permission, colors } = useAcademy();
  if (!home) return null;
  return (
    <Screen tab>
      <AppText role="label">System Design Academy</AppText>
      <AppText role="display">Day {home.dayNumber}</AppText>
      <AppText>{home.dayTitle}</AppText>
      <AppText role="small">{home.phaseTitle}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={`${home.completedSessions} sessions completed`} active />
        <Pill label={`Streak ${home.streakCurrent}`} />
        <Pill label={`Longest ${home.streakLongest}`} />
        <Pill label={`${home.revisionsDue} reviews due`} />
      </View>
      {home.nextSession ? (
        <Card>
          <AppText role="label">Next lesson</AppText>
          <AppText role="title">{home.nextSession.title}</AppText>
          <AppText role="small">
            {home.nextSession.slot === 'morning' ? 'Morning' : 'Evening'} · about {home.nextDuration} minutes
          </AppText>
          <Button label="Continue" onPress={() => openSession(home.nextSession!.id)} />
        </Card>
      ) : (
        <Card>
          <AppText role="title">Authored lessons are complete</AppText>
          <AppText>
            The next planned day is {home.upcomingTitle}. It is visible in the curriculum and cannot be marked complete until it is published. Your history stays on this device.
          </AppText>
        </Card>
      )}
      <SessionRow title="Morning" card={home.morning} />
      <SessionRow title="Evening" card={home.evening} />
      {permission === 'undetermined' ? (
        <Card>
          <AppText role="title">Reminders stay on this phone</AppText>
          <AppText role="small">
            Morning and evening reminders are optional local notifications. You can turn them on in Settings. Nothing is sent to a server.
          </AppText>
          <Button label="Notification settings" tone="secondary" onPress={() => router.push('/settings')} />
        </Card>
      ) : null}
      <AppText role="small" color={colors.muted}>
        Opening the app does not count as study. A session counts when you record an assessment.
      </AppText>
    </Screen>
  );
}

function SessionRow({
  title,
  card,
}: {
  title: string;
  card: { id: string; title: string; status: keyof typeof statusLabel; durationMinutes: number };
}) {
  return (
    <Card>
      <AppText role="label">{title}</AppText>
      <AppText role="title">{card.title}</AppText>
      <AppText role="small">
        {statusLabel[card.status]} · {card.durationMinutes} min
      </AppText>
      <Button label="Open" tone="secondary" onPress={() => openSession(card.id)} />
    </Card>
  );
}

function openSession(sessionId: string) {
  router.push({ pathname: '/lesson/[sessionId]', params: { sessionId } });
}
