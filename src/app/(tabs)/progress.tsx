import { useState } from 'react';
import { View } from 'react-native';

import { localDateISO } from '@/engine/dates';
import { eventsOn } from '@/engine/selectors';
import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Screen } from '@/ui/components';
import { Heatmap } from '@/ui/Heatmap';

export default function ProgressScreen() {
  const { progress, snapshot, restToday, colors } = useAcademy();
  const [selected, setSelected] = useState<string | null>(null);
  if (!progress || !snapshot) return null;
  const today = localDateISO(new Date());
  const events = selected ? eventsOn(snapshot, selected) : [];
  const activity = snapshot.activity.find((row) => row.localDate === selected);
  const restingToday = snapshot.activity.find((row) => row.localDate === today)?.restDay ?? false;
  return (
    <Screen tab>
      <AppText role="display">Progress</AppText>
      <AppText role="small">Squares count completed sessions and reviews. Opening the app does not fill a square. A marked rest day keeps a streak and adds no level.</AppText>
      <Card>
        <Heatmap weeks={progress.heatmap.weeks} monthLabels={progress.heatmap.monthLabels} selected={selected} onSelect={setSelected} />
      </Card>
      {selected ? (
        <Card>
          <AppText role="title">{selected}</AppText>
          <AppText role="small">
            {activity ? `${activity.completedSessions} sessions, ${activity.completedRevisions} reviews` : 'No completed learning'}
            {activity?.restDay ? ' · rest day' : ''}
          </AppText>
          {events.length === 0 ? <AppText role="small">No recorded work.</AppText> : null}
          {events.map((event) => (
            <AppText key={event.id}>{event.title}</AppText>
          ))}
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat label="Current streak" value={String(progress.streaks.current)} />
        <Stat label="Longest streak" value={String(progress.streaks.longest)} />
        <Stat label="Sessions" value={String(progress.completedSessions)} />
        <Stat label="Morning" value={String(progress.morningCompleted)} />
        <Stat label="Evening" value={String(progress.eveningCompleted)} />
        <Stat label="Mastered" value={String(progress.mastered)} />
        <Stat label="Weak" value={String(progress.weak)} />
        <Stat label="This week" value={String(progress.weekCount)} />
        <Stat label="This month" value={String(progress.monthCount)} />
      </View>
      <Button
        label={restingToday ? 'Clear today as a rest day' : 'Mark today as a rest day'}
        tone="secondary"
        onPress={() => restToday(!restingToday)}
      />
      {progress.phases.map((phase) => (
        <Card key={phase.id}>
          <AppText role="title">{phase.title}</AppText>
          <AppText role="small">
            {phase.completed} of {phase.authored} authored sessions complete
            {phase.planned ? ` · ${phase.planned} still planned` : ''}
          </AppText>
          <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.surface2, overflow: 'hidden' }}>
            <View
              style={{
                height: 8,
                width: `${phase.authored === 0 ? 0 : Math.round((phase.completed / phase.authored) * 100)}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: '46%', maxWidth: '100%' }}>
      <AppText role="label">{label}</AppText>
      <AppText role="title">{value}</AppText>
    </Card>
  );
}
