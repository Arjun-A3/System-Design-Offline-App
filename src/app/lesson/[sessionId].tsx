import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { conceptsById, resourcesById, sessionsById } from '@/curriculum';
import type { CriterionMark, FullSession } from '@/curriculum/types';
import { prerequisiteBlock } from '@/engine/selectors';
import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Field, Screen } from '@/ui/components';

const marks: { id: CriterionMark; label: string }[] = [
  { id: 'understood_independently', label: 'Understood independently' },
  { id: 'understood_with_hint', label: 'Understood with a hint' },
  { id: 'not_understood', label: 'Not understood yet' },
];

export default function LessonScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const academy = useAcademy();
  const session = sessionsById.get(sessionId ?? '');
  const record = academy.snapshot?.sessions.find((item) => item.sessionId === session?.id);
  const [answer, setAnswer] = useState(record?.answerDraft ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [rubric, setRubric] = useState<Record<string, CriterionMark>>({});
  const [confidence, setConfidence] = useState<number | null>(record?.lastConfidence ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!session || hydratedFor === session.id) return;
    setAnswer(record?.answerDraft ?? '');
    setNotes(record?.notes ?? '');
    setConfidence(record?.lastConfidence ?? null);
    setRubric({});
    setHydratedFor(session.id);
  }, [hydratedFor, record?.answerDraft, record?.lastConfidence, record?.notes, session]);

  if (!session || !academy.snapshot) {
    return (
      <Screen>
        <AppText role="title">This lesson is not in the bundled curriculum.</AppText>
      </Screen>
    );
  }

  const blocked = prerequisiteBlock(session, academy.snapshot);

  return (
    <Screen>
      <Stack.Screen options={{ title: `Day ${session.dayNumber}` }} />
      <AppText role="label">
        Day {session.dayNumber} · {session.slot} · {session.difficulty} · {session.durationMinutes} min
      </AppText>
      <AppText role="display">{session.title}</AppText>
      {session.objectives.map((objective) => (
        <AppText key={objective}>• {objective}</AppText>
      ))}
      {blocked.length > 0 ? (
        <Card>
          <AppText role="title">Prerequisites are still open</AppText>
          <AppText>You can read ahead. Completion stays locked so a missed day cannot skip the path.</AppText>
          {blocked.map((id) => (
            <AppText key={id} role="small">
              {sessionsById.get(id)?.title ?? id}
            </AppText>
          ))}
        </Card>
      ) : null}
      {session.depth === 'planned' ? (
        <Card>
          <AppText role="title">Planned, not yet authored</AppText>
          <AppText>{session.intent}</AppText>
          <AppText role="small">This session cannot be completed. Progress remains on the last authored lesson.</AppText>
        </Card>
      ) : (
        <FullLesson
          session={session}
          answer={answer}
          notes={notes}
          rubric={rubric}
          confidence={confidence}
          hintsRevealed={record?.hintsRevealed ?? 0}
          referenceRevealed={record?.referenceRevealed ?? false}
          bookmarked={record?.bookmarked ?? false}
          completed={record?.status === 'completed'}
          locked={blocked.length > 0}
          error={error}
          saved={saved}
          onAnswer={(value) => {
            setAnswer(value);
            setSaved(null);
          }}
          onNotes={setNotes}
          onRubric={(id, mark) => setRubric((current) => ({ ...current, [id]: mark }))}
          onConfidence={setConfidence}
          onSaveAnswer={async () => {
            await academy.saveAnswer(session.id, answer);
            setSaved('Answer saved on this device.');
          }}
          onHint={async () => academy.revealHint(session.id, (record?.hintsRevealed ?? 0) + 1)}
          onReference={async () => academy.showReference(session.id)}
          onNotesBlur={async () => academy.updateNotes(session.id, notes)}
          onBookmark={async () => academy.toggleBookmark(session.id, !(record?.bookmarked ?? false))}
          onPostpone={async () => {
            await academy.postpone(session.id);
            setSaved('Postponed. It stays next in the path.');
          }}
          onSubmit={async () => {
            try {
              setError(null);
              await academy.saveAnswer(session.id, answer);
              if (confidence === null) throw new Error('Choose a confidence rating from 1 to 5.');
              await academy.submit(session, answer, rubric, confidence);
              setSaved('Recorded. This score is your own assessment. The app did not grade the writing.');
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Could not save the session.');
            }
          }}
        />
      )}
      <AppText role="label">Related concepts</AppText>
      {session.conceptIds.map((id) => (
        <Card key={id}>
          <AppText role="title">{conceptsById.get(id)?.title ?? id}</AppText>
          <AppText role="small">{conceptsById.get(id)?.summary}</AppText>
        </Card>
      ))}
      {session.resourceIds.length > 0 ? <AppText role="label">Optional reading</AppText> : null}
      {session.resourceIds.map((id) => {
        const resource = resourcesById.get(id);
        if (!resource) return null;
        return (
          <Card key={id}>
            <AppText role="title">{resource.title}</AppText>
            <AppText role="small">
              {resource.publisher}
              {resource.published ? ` · ${resource.published}` : ''}
            </AppText>
            <AppText>{resource.summary}</AppText>
            <Button
              label="Open link"
              tone="secondary"
              onPress={() =>
                Alert.alert('This page is not bundled', 'Opening it needs an internet connection. The lesson stands without it.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => Linking.openURL(resource.url) },
                ])
              }
            />
          </Card>
        );
      })}
    </Screen>
  );
}

function FullLesson({
  session,
  answer,
  notes,
  rubric,
  confidence,
  hintsRevealed,
  referenceRevealed,
  bookmarked,
  completed,
  locked,
  error,
  saved,
  onAnswer,
  onNotes,
  onRubric,
  onConfidence,
  onSaveAnswer,
  onHint,
  onReference,
  onNotesBlur,
  onBookmark,
  onPostpone,
  onSubmit,
}: {
  session: FullSession;
  answer: string;
  notes: string;
  rubric: Record<string, CriterionMark>;
  confidence: number | null;
  hintsRevealed: number;
  referenceRevealed: boolean;
  bookmarked: boolean;
  completed: boolean;
  locked: boolean;
  error: string | null;
  saved: string | null;
  onAnswer: (value: string) => void;
  onNotes: (value: string) => void;
  onRubric: (id: string, mark: CriterionMark) => void;
  onConfidence: (value: number) => void;
  onSaveAnswer: () => Promise<void>;
  onHint: () => Promise<void>;
  onReference: () => Promise<void>;
  onNotesBlur: () => Promise<void>;
  onBookmark: () => Promise<void>;
  onPostpone: () => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const { colors } = useAcademy();
  return (
    <>
      <AppText role="title">Why it matters</AppText>
      <Prose text={session.whyItMatters} />
      <AppText role="title">Explanation</AppText>
      <Prose text={session.explanation} />
      <Card>
        <AppText role="label">Question</AppText>
        <AppText>{session.question}</AppText>
      </Card>
      <AppText role="label">Your answer</AppText>
      <Field
        multiline
        value={answer}
        onChangeText={onAnswer}
        onEndEditing={onSaveAnswer}
        accessibilityLabel="Answer editor"
        placeholder="Write the reasoning before you open the reference."
      />
      <Button label="Save answer" tone="secondary" onPress={onSaveAnswer} />
      <Card>
        <AppText role="title">Hints</AppText>
        {session.hints.slice(0, hintsRevealed).map((hint) => (
          <AppText key={hint}>{hint}</AppText>
        ))}
        {hintsRevealed < session.hints.length ? (
          <Button label={`Show hint ${hintsRevealed + 1}`} tone="secondary" onPress={onHint} />
        ) : (
          <AppText role="small">All hints are visible. Using them slows the next review.</AppText>
        )}
      </Card>
      <Card>
        <AppText role="title">Reference solution</AppText>
        {referenceRevealed ? (
          <>
            <Prose text={session.referenceSolution} />
            <AppText role="label">Expected outline</AppText>
            {session.expectedOutline.map((item) => (
              <AppText key={item}>• {item}</AppText>
            ))}
            <AppText role="label">Follow-ups</AppText>
            {session.followUps.map((item) => (
              <AppText key={item}>• {item}</AppText>
            ))}
          </>
        ) : (
          <>
            <AppText role="small">Reading this before you answer is allowed. It is recorded and treated as assistance.</AppText>
            <Button label="Show reference solution" tone="secondary" onPress={onReference} />
          </>
        )}
      </Card>
      <Card>
        <AppText role="title">Self-assessment</AppText>
        <AppText role="small">
          Mark what you can account for. This is not an automated grade of your writing. The app stores your marks and uses them only to schedule review.
        </AppText>
        {session.rubric.map((criterion) => (
          <View key={criterion.id} style={{ gap: 6 }}>
            <AppText>{criterion.description}</AppText>
            {marks.map((mark) => {
              const selected = rubric[criterion.id] === mark.id;
              return (
                <Pressable
                  key={mark.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onRubric(criterion.id, mark.id)}
                  style={{ minHeight: 44, justifyContent: 'center' }}>
                  <AppText color={selected ? colors.accent : colors.ink}>{selected ? '● ' : '○ '}{mark.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
        <AppText role="label">Confidence</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Confidence ${value} of 5`}
              accessibilityState={{ selected: confidence === value }}
              onPress={() => onConfidence(value)}
              style={{
                flexGrow: 1,
                flexBasis: 48,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: confidence === value ? colors.accent : colors.surface2,
              }}>
              <AppText color={confidence === value ? colors.accentInk : colors.ink}>{value}</AppText>
            </Pressable>
          ))}
        </View>
        <AppText role="small">1 is a guess. 5 means you could teach the reasoning.</AppText>
      </Card>
      {completed ? (
        <AppText role="small">This session is already complete. Submitting again records a review and counts as review activity.</AppText>
      ) : null}
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
      {saved ? <AppText>{saved}</AppText> : null}
      <Button label={completed ? 'Record review' : 'Record assessment'} disabled={locked} onPress={onSubmit} />
      {!completed ? <Button label="Postpone" tone="secondary" onPress={onPostpone} /> : null}
      <AppText role="title">Engineering context</AppText>
      <Prose text={session.engineeringContext} />
      <AppText role="label">Common mistakes</AppText>
      {session.commonMistakes.map((item) => (
        <AppText key={item}>• {item}</AppText>
      ))}
      <AppText role="label">Trade-offs</AppText>
      {session.tradeoffs.map((item) => (
        <AppText key={item}>• {item}</AppText>
      ))}
      <AppText role="title">Notes</AppText>
      <Field multiline value={notes} onChangeText={onNotes} onEndEditing={onNotesBlur} accessibilityLabel="Lesson notes" />
      <Button label={bookmarked ? 'Remove bookmark' : 'Bookmark'} tone="secondary" onPress={onBookmark} />
    </>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph) => (
        <AppText key={paragraph.slice(0, 48)}>{paragraph}</AppText>
      ))}
    </>
  );
}
