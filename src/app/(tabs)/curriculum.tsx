import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { curriculumDays, phasesById } from '@/curriculum';
import type { Difficulty, PhaseId } from '@/curriculum/types';
import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Field, Pill, Screen } from '@/ui/components';

const filters: Array<'all' | Difficulty | 'authored' | 'planned'> = ['all', 'authored', 'planned', 'foundational', 'intermediate', 'advanced'];

export default function CurriculumScreen() {
  const { snapshot, progress } = useAcademy();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const completed = useMemo(
    () => new Set((snapshot?.sessions ?? []).filter((session) => session.status === 'completed').map((session) => session.sessionId)),
    [snapshot],
  );
  const days = curriculumDays.filter((day) => {
    const text = `${day.title} ${day.phaseId} ${day.morning.title} ${day.evening.title}`.toLowerCase();
    if (query && !text.includes(query.trim().toLowerCase())) return false;
    if (filter === 'authored') return day.number <= 14;
    if (filter === 'planned') return day.number > 14;
    if (filter === 'foundational' || filter === 'intermediate' || filter === 'advanced') {
      return day.morning.difficulty === filter;
    }
    return true;
  });

  return (
    <Screen tab>
      <AppText role="display">Curriculum</AppText>
      <AppText role="small">210 days in a fixed order. The first 14 are fully written. Later days keep their place and cannot be completed early.</AppText>
      <Field value={query} onChangeText={setQuery} placeholder="Search lessons" accessibilityLabel="Search lessons" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {filters.map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)}>
            <Pill label={item} active={filter === item} />
          </Pressable>
        ))}
      </View>
      {(progress?.phases ?? []).map((phase) => (
        <Card key={phase.id}>
          <AppText role="title">{phase.title}</AppText>
          <AppText role="small">
            {phase.completed}/{phase.authored} authored sessions · {phase.planned} planned
          </AppText>
          <Button
            label="Open phase"
            tone="secondary"
            onPress={() => router.push({ pathname: '/phase/[phaseId]', params: { phaseId: phase.id } })}
          />
        </Card>
      ))}
      {days.slice(0, 40).map((day) => {
        const phase = phasesById.get(day.phaseId as PhaseId);
        const morningDone = completed.has(day.morning.id);
        const eveningDone = completed.has(day.evening.id);
        return (
          <Card key={day.id}>
            <AppText role="label">Day {day.number} · {phase?.title}</AppText>
            <AppText role="title">{day.title}</AppText>
            <AppText role="small">
              {day.number <= 14 ? 'Authored' : 'Planned'} · morning {morningDone ? 'done' : 'open'} · evening {eveningDone ? 'done' : 'open'}
            </AppText>
            <Button label="Morning" tone="secondary" onPress={() => openSession(day.morning.id)} />
            <Button label="Evening" tone="secondary" onPress={() => openSession(day.evening.id)} />
          </Card>
        );
      })}
      {days.length > 40 ? <AppText role="small">Showing 40 matches. Narrow the search to see more.</AppText> : null}
    </Screen>
  );
}

function openSession(sessionId: string) {
  router.push({ pathname: '/lesson/[sessionId]', params: { sessionId } });
}
