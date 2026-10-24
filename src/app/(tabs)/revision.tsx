import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { useAcademy } from '@/state/AppProvider';
import { AppText, Button, Card, Screen } from '@/ui/components';

export default function RevisionScreen() {
  const { revision } = useAcademy();
  if (!revision) return null;
  const open = revision.misconceptions.filter((item) => !item.resolved);
  return (
    <Screen tab>
      <AppText role="display">Revision</AppText>
      <AppText role="small">The curriculum queue and the review queue are separate. A missed day does not delete either one.</AppText>
      <Section title="Due reviews" empty="Nothing is due. Solid work moves the next review out. Gaps schedule one for today.">
        {revision.due.map((item) => (
          <Card key={item.id}>
            <AppText role="title">{item.conceptTitle}</AppText>
            <AppText role="small">
              {item.reason} · due {item.dueOn}
            </AppText>
            {item.sessionId ? <Button label="Review" onPress={() => openSession(item.sessionId!)} /> : null}
          </Card>
        ))}
      </Section>
      <Section title="Weak concepts" empty="No weak concepts yet. A low self-assessment or a gap on the rubric lands here.">
        {revision.weak.map((item) => (
          <Card key={item.conceptId}>
            <AppText role="title">{item.title}</AppText>
            <AppText role="small">
              {item.status}
              {item.score === null ? '' : ` · self-assessed coverage ${item.score}`}
            </AppText>
          </Card>
        ))}
      </Section>
      <Section title="Bookmarks" empty="Bookmark a lesson from its workspace.">
        {revision.bookmarks.map((item) => (
          <Card key={item.sessionId}>
            <AppText role="title">{item.title}</AppText>
            <Button label="Open" tone="secondary" onPress={() => openSession(item.sessionId)} />
          </Card>
        ))}
      </Section>
      <Section title="Unfinished sessions" empty="No postponed or in-progress sessions.">
        {revision.unfinished.map((item) => (
          <Card key={item.sessionId}>
            <AppText role="title">{item.title}</AppText>
            <AppText role="small">{item.status}</AppText>
            <Button label="Resume" tone="secondary" onPress={() => openSession(item.sessionId)} />
          </Card>
        ))}
      </Section>
      <Section title="Misconceptions" empty="Gaps you mark on a rubric are listed here until a solid review clears them.">
        {open.map((item) => (
          <Card key={item.id}>
            <AppText role="small">{item.conceptTitle}</AppText>
            <AppText>{item.statement}</AppText>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <>
      <AppText role="title">{title}</AppText>
      {children.length === 0 ? <AppText role="small">{empty}</AppText> : children}
    </>
  );
}

function openSession(sessionId: string) {
  router.push({ pathname: '/lesson/[sessionId]', params: { sessionId } });
}
