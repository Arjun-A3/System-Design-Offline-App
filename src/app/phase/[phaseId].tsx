import { Stack, router, useLocalSearchParams } from 'expo-router';

import { curriculumDays, phasesById } from '@/curriculum';
import type { PhaseId } from '@/curriculum/types';
import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Screen } from '@/ui/components';

export default function PhaseScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const phase = phasesById.get(phaseId as PhaseId);
  const { snapshot } = useAcademy();
  if (!phase) {
    return (
      <Screen>
        <AppText>Unknown phase.</AppText>
      </Screen>
    );
  }
  const completed = new Set((snapshot?.sessions ?? []).filter((session) => session.status === 'completed').map((session) => session.sessionId));
  const days = curriculumDays.filter((day) => day.phaseId === phase.id);
  return (
    <Screen>
      <Stack.Screen options={{ title: phase.title }} />
      <AppText role="display">{phase.title}</AppText>
      <AppText>{phase.summary}</AppText>
      <AppText role="small">{phase.topics.join(' · ')}</AppText>
      {days.map((day) => (
        <Card key={day.id}>
          <AppText role="label">Day {day.number} · {day.number <= 14 ? 'Authored' : 'Planned'}</AppText>
          <AppText role="title">{day.title}</AppText>
          <AppText role="small">Requires {day.morning.prerequisiteSessionIds.join(', ') || 'nothing'}</AppText>
          <AppText role="small">Morning {completed.has(day.morning.id) ? 'complete' : day.morning.depth} · {day.morning.difficulty}</AppText>
          <Button label={day.morning.title} tone="secondary" onPress={() => open(day.morning.id)} />
          <Button label={day.evening.title} tone="secondary" onPress={() => open(day.evening.id)} />
        </Card>
      ))}
    </Screen>
  );
}

function open(sessionId: string) {
  router.push({ pathname: '/lesson/[sessionId]', params: { sessionId } });
}
