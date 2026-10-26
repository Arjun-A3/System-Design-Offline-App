import { buildFullDay } from '../author';
import type { CurriculumDay } from '../types';
import type { RoadmapTopic } from '../roadmap';

export type SessionDraft = {
  title: string;
  why: string;
  explain: string;
  question: string;
  hints: readonly [string, string, ...string[]];
  outline: readonly [string, string, string, ...string[]];
  solution: string;
  rubric: readonly [string, string, ...string[]];
  myth: readonly [string, string];
  context: string;
  tradeoff: string;
  mistake: string;
  followUp: string;
  extension: string;
  alternative: string;
};

export type LessonPair = {
  morning: SessionDraft;
  evening: SessionDraft;
};

export function publishRoadmap(topics: readonly RoadmapTopic[], lessons: Readonly<Record<string, LessonPair>>): CurriculumDay[] {
  const missing = topics.filter((topic) => !lessons[topic.slug]).map((topic) => topic.slug);
  if (missing.length > 0) {
    throw new Error(`Missing published lessons:\n${missing.join('\n')}`);
  }
  const known = new Set(topics.map((topic) => topic.slug));
  const extra = Object.keys(lessons).filter((slug) => !known.has(slug));
  if (extra.length > 0) {
    throw new Error(`Lessons with no roadmap topic:\n${extra.join('\n')}`);
  }
  return topics.map((topic) => {
    const lesson = lessons[topic.slug];
    if (!lesson) throw new Error(`Missing published lesson ${topic.slug}.`);
    return buildFullDay({
      day: topic.dayNumber,
      phaseId: topic.phaseId,
      title: topic.title,
      morning: toFull(topic, 'morning', lesson.morning, 18),
      evening: toFull(topic, 'evening', lesson.evening, 16),
    });
  });
}

function toFull(topic: RoadmapTopic, slot: 'morning' | 'evening', draft: SessionDraft, durationMinutes: number) {
  const conceptId = `concept.${topic.slug}`;
  const label = `day.${String(topic.dayNumber).padStart(3, '0')}.${slot}`;
  requireText(label, 'why', draft.why, 80);
  requireText(label, 'explanation', draft.explain, 320);
  requireText(label, 'question', draft.question, 80);
  requireText(label, 'reference', draft.solution, 320);
  requireText(label, 'context', draft.context, 80);
  for (const hint of draft.hints) requireText(label, 'hint', hint, 40);
  for (const item of draft.outline) requireText(label, 'outline', item, 20);
  for (const item of draft.rubric) requireText(label, 'rubric', item, 40);
  requireText(label, 'myth', draft.myth[0], 40);
  requireText(label, 'myth correction', draft.myth[1], 40);
  requireText(label, 'tradeoff', draft.tradeoff, 40);
  requireText(label, 'mistake', draft.mistake, 40);
  requireText(label, 'follow-up', draft.followUp, 40);
  requireText(label, 'extension', draft.extension, 40);
  requireText(label, 'alternative', draft.alternative, 40);
  return {
    title: draft.title,
    conceptIds: [conceptId],
    objectives: [slot === 'morning' ? topic.morningObjective : topic.eveningObjective],
    durationMinutes,
    difficulty: topic.difficulty,
    whyItMatters: draft.why,
    explanation: draft.explain,
    question: draft.question,
    hints: [...draft.hints],
    expectedOutline: [...draft.outline],
    referenceSolution: draft.solution,
    rubric: draft.rubric.map((description, index) => ({
      id: index === 0 ? 'primary' : `decision-${index}`,
      description,
      conceptId,
    })),
    misconceptions: [{ id: 'myth', statement: draft.myth[0], correction: draft.myth[1] }],
    engineeringContext: draft.context,
    extensionQuestions: [draft.extension],
    acceptableAlternatives: [draft.alternative],
    tradeoffs: [draft.tradeoff],
    commonMistakes: [draft.mistake],
    followUps: [draft.followUp],
  };
}

function requireText(label: string, field: string, value: string, min: number) {
  if (value.trim().length < min) {
    throw new Error(`${label} ${field} is too thin (${value.trim().length} < ${min}).`);
  }
}
