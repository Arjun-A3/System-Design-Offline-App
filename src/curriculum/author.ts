import { dayId, sessionId } from './ids';
import type { CurriculumDay, Difficulty, FullSession, PhaseId, PlannedSession, SessionSlot } from './types';

type RubricDraft = { id: string; description: string; conceptId: string };
type MisconceptionDraft = { id: string; statement: string; correction: string };

export type FullDraft = {
  title: string;
  conceptIds: string[];
  objectives: string[];
  durationMinutes: number;
  difficulty: Difficulty;
  resourceIds?: string[];
  extraPrerequisiteSessionIds?: string[];
  whyItMatters: string;
  explanation: string;
  question: string;
  hints: string[];
  expectedOutline: string[];
  referenceSolution: string;
  rubric: RubricDraft[];
  misconceptions: MisricDraft[];
  engineeringContext: string;
  extensionQuestions: string[];
  acceptableAlternatives: string[];
  tradeoffs: string[];
  commonMistakes: string[];
  followUps: string[];
};

type MisricDraft = MisconceptionDraft;

export function buildFullDay(input: {
  day: number;
  phaseId: PhaseId;
  title: string;
  morning: FullDraft;
  evening: FullDraft;
}): CurriculumDay {
  const morning = buildFull(input.day, 'morning', input.phaseId, input.morning, prerequisiteIds(input.day, 'morning', input.morning));
  const evening = buildFull(input.day, 'evening', input.phaseId, input.evening, prerequisiteIds(input.day, 'evening', input.evening));
  return {
    id: dayId(input.day),
    number: input.day,
    phaseId: input.phaseId,
    title: input.title,
    morning,
    evening,
  };
}

export function buildPlannedDay(input: {
  day: number;
  phaseId: PhaseId;
  title: string;
  conceptId: string;
  difficulty: Difficulty;
  morningObjective: string;
  eveningObjective: string;
  morningIntent: string;
  eveningIntent: string;
  resourceIds?: string[];
}): CurriculumDay {
  const morning = buildPlanned(input.day, 'morning', input.phaseId, {
    title: input.title,
    conceptIds: [input.conceptId],
    objectives: [input.morningObjective],
    difficulty: input.difficulty,
    intent: input.morningIntent,
    resourceIds: input.resourceIds ?? [],
  });
  const evening = buildPlanned(input.day, 'evening', input.phaseId, {
    title: `Apply: ${input.title}`,
    conceptIds: [input.conceptId],
    objectives: [input.eveningObjective],
    difficulty: input.difficulty,
    intent: input.eveningIntent,
    resourceIds: input.resourceIds ?? [],
  });
  return {
    id: dayId(input.day),
    number: input.day,
    phaseId: input.phaseId,
    title: input.title,
    morning,
    evening,
  };
}

function prerequisiteIds(day: number, slot: SessionSlot, draft: FullDraft): string[] {
  const base = slot === 'morning' ? (day > 1 ? [sessionId(day - 1, 'evening')] : []) : [sessionId(day, 'morning')];
  return [...new Set([...base, ...(draft.extraPrerequisiteSessionIds ?? [])])];
}

function buildFull(
  day: number,
  slot: SessionSlot,
  phaseId: PhaseId,
  draft: FullDraft,
  prerequisiteSessionIds: string[],
): FullSession {
  const id = sessionId(day, slot);
  return {
    id,
    dayId: dayId(day),
    dayNumber: day,
    slot,
    phaseId,
    depth: 'full',
    title: draft.title,
    conceptIds: draft.conceptIds,
    prerequisiteSessionIds,
    objectives: draft.objectives,
    durationMinutes: draft.durationMinutes,
    difficulty: draft.difficulty,
    resourceIds: draft.resourceIds ?? [],
    whyItMatters: draft.whyItMatters,
    explanation: draft.explanation,
    question: draft.question,
    hints: draft.hints,
    expectedOutline: draft.expectedOutline,
    referenceSolution: draft.referenceSolution,
    rubric: draft.rubric.map((criterion) => ({ ...criterion, id: `${id}.${criterion.id}` })),
    misconceptions: draft.misconceptions.map((item) => ({ ...item, id: `${id}.${item.id}` })),
    engineeringContext: draft.engineeringContext,
    extensionQuestions: draft.extensionQuestions,
    acceptableAlternatives: draft.acceptableAlternatives,
    tradeoffs: draft.tradeoffs,
    commonMistakes: draft.commonMistakes,
    followUps: draft.followUps,
  };
}

function buildPlanned(
  day: number,
  slot: SessionSlot,
  phaseId: PhaseId,
  draft: {
    title: string;
    conceptIds: string[];
    objectives: string[];
    difficulty: Difficulty;
    intent: string;
    resourceIds: string[];
  },
): PlannedSession {
  const base = slot === 'morning' ? (day > 1 ? [sessionId(day - 1, 'evening')] : []) : [sessionId(day, 'morning')];
  return {
    id: sessionId(day, slot),
    dayId: dayId(day),
    dayNumber: day,
    slot,
    phaseId,
    depth: 'planned',
    title: draft.title,
    conceptIds: draft.conceptIds,
    prerequisiteSessionIds: base,
    objectives: draft.objectives,
    durationMinutes: 15,
    difficulty: draft.difficulty,
    resourceIds: draft.resourceIds,
    intent: draft.intent,
  };
}
