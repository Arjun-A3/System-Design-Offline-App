import type { CriterionMark, FullSession, MasteryStatus, PerformanceGrade } from '../curriculum/types';
import { assertConfidence, classifyPerformance } from './assessment';
import { scheduleNext } from './repetition';

export const MIN_ANSWER_LENGTH = 20;

export type MasterySnapshot = {
  conceptId: string;
  attemptCount: number;
  hintUsageCount: number;
  intervalIndex: number;
  lastSuccessfulAt: string | null;
};

export type ExistingSessionSnapshot = {
  status: 'in_progress' | 'completed' | 'postponed';
  notes: string;
  bookmarked: boolean;
  startedAt: string | null;
  completedAt: string | null;
  postponedAt: string | null;
  postponeCount: number;
};

export type AssessmentPlan = {
  grade: PerformanceGrade;
  score: number;
  session: {
    sessionId: string;
    status: 'completed';
    answerDraft: string;
    hintsRevealed: number;
    referenceRevealed: boolean;
    notes: string;
    bookmarked: boolean;
    startedAt: string;
    completedAt: string;
    postponedAt: string | null;
    postponeCount: number;
    lastConfidence: number;
    updatedAt: string;
  };
  assessment: {
    rubricJson: string;
    rubricScore: number;
    confidence: number;
    hintsUsed: number;
    referenceRevealed: boolean;
    grade: PerformanceGrade;
    createdAt: string;
  };
  mastery: {
    conceptId: string;
    attemptCount: number;
    lastRubricScore: number;
    lastConfidence: number;
    hintUsageCount: number;
    lastAttemptAt: string;
    lastSuccessfulAt: string | null;
    nextReviewAt: string;
    intervalDays: number;
    intervalIndex: number;
    masteryStatus: MasteryStatus;
    updatedAt: string;
  }[];
  revisions: {
    conceptId: string;
    sessionId: string | null;
    dueOn: string;
    reason: 'struggle' | 'prerequisite' | 'interval';
  }[];
  completeRevisionConceptIds: string[];
  activityKind: 'session_completed' | 'revision_completed';
  activityTitle: string;
  misconceptions: { conceptId: string; misconceptionId: string; statement: string }[];
  resolveConceptIds: string[];
  firstCompletion: boolean;
};

export function planAssessment(input: {
  session: FullSession;
  marks: Record<string, CriterionMark>;
  confidence: number;
  answer: string;
  hintsRevealed: number;
  referenceRevealed: boolean;
  today: string;
  nowIso: string;
  existing: ExistingSessionSnapshot | null;
  mastery: MasterySnapshot[];
  prerequisiteConceptIds: { conceptId: string; sessionId: string }[];
  incompletePrerequisiteIds: string[];
}): AssessmentPlan {
  if (input.session.depth !== 'full') {
    throw new Error('This lesson is not authored yet.');
  }
  if (input.incompletePrerequisiteIds.length > 0) {
    throw new Error('Complete the prerequisite lessons first. Missing a day does not skip them.');
  }
  if (input.answer.trim().length < MIN_ANSWER_LENGTH) {
    throw new Error('Write a short answer before recording the session. A few sentences is enough.');
  }
  assertConfidence(input.confidence);
  const marks = input.session.rubric.map((criterion) => {
    const mark = input.marks[criterion.id];
    if (!mark) throw new Error('Mark every rubric criterion before saving the session.');
    return mark;
  });
  const extraMarks = Object.keys(input.marks).filter((id) => !input.session.rubric.some((criterion) => criterion.id === id));
  if (extraMarks.length > 0) throw new Error('The assessment contains an unknown rubric criterion.');

  const { grade, score } = classifyPerformance({
    marks,
    confidence: input.confidence,
    hintsUsed: input.hintsRevealed,
    referenceRevealed: input.referenceRevealed,
  });
  const firstCompletion = input.existing?.status !== 'completed';
  const masteryById = new Map(input.mastery.map((row) => [row.conceptId, row]));

  const mastery = input.session.conceptIds.map((conceptId) => {
    const previous = masteryById.get(conceptId);
    const schedule = scheduleNext(previous?.intervalIndex ?? 0, grade, input.today);
    const solid = grade === 'solid';
    return {
      conceptId,
      attemptCount: (previous?.attemptCount ?? 0) + 1,
      lastRubricScore: score,
      lastConfidence: input.confidence,
      hintUsageCount: (previous?.hintUsageCount ?? 0) + input.hintsRevealed,
      lastAttemptAt: input.nowIso,
      lastSuccessfulAt: solid ? input.nowIso : previous?.lastSuccessfulAt ?? null,
      nextReviewAt: schedule.nextReviewDate,
      intervalDays: schedule.intervalDays,
      intervalIndex: schedule.intervalIndex,
      masteryStatus: schedule.status,
      updatedAt: input.nowIso,
    };
  });

  const revisions: AssessmentPlan['revisions'] = [];
  if (grade === 'struggle') {
    for (const conceptId of input.session.conceptIds) {
      revisions.push({ conceptId, sessionId: input.session.id, dueOn: input.today, reason: 'struggle' });
    }
    for (const prerequisite of input.prerequisiteConceptIds) {
      if (input.session.conceptIds.includes(prerequisite.conceptId)) continue;
      revisions.push({
        conceptId: prerequisite.conceptId,
        sessionId: prerequisite.sessionId,
        dueOn: input.today,
        reason: 'prerequisite',
      });
    }
  } else {
    for (const row of mastery) {
      revisions.push({
        conceptId: row.conceptId,
        sessionId: input.session.id,
        dueOn: row.nextReviewAt,
        reason: 'interval',
      });
    }
  }

  const gaps = input.session.rubric.filter((criterion) => input.marks[criterion.id] === 'not_understood');
  const misconceptions =
    gaps.length > 0
      ? input.session.misconceptions.flatMap((item) =>
          input.session.conceptIds.map((conceptId) => ({
            conceptId,
            misconceptionId: item.id,
            statement: item.statement,
          })),
        )
      : [];

  return {
    grade,
    score,
    firstCompletion,
    session: {
      sessionId: input.session.id,
      status: 'completed',
      answerDraft: input.answer,
      hintsRevealed: input.hintsRevealed,
      referenceRevealed: input.referenceRevealed,
      notes: input.existing?.notes ?? '',
      bookmarked: input.existing?.bookmarked ?? false,
      startedAt: input.existing?.startedAt ?? input.nowIso,
      completedAt: input.existing?.completedAt ?? input.nowIso,
      postponedAt: input.existing?.postponedAt ?? null,
      postponeCount: input.existing?.postponeCount ?? 0,
      lastConfidence: input.confidence,
      updatedAt: input.nowIso,
    },
    assessment: {
      rubricJson: JSON.stringify(input.marks),
      rubricScore: score,
      confidence: input.confidence,
      hintsUsed: input.hintsRevealed,
      referenceRevealed: input.referenceRevealed,
      grade,
      createdAt: input.nowIso,
    },
    mastery,
    revisions,
    completeRevisionConceptIds: input.session.conceptIds,
    activityKind: firstCompletion ? 'session_completed' : 'revision_completed',
    activityTitle: input.session.title,
    misconceptions,
    resolveConceptIds: grade === 'solid' ? input.session.conceptIds : [],
  };
}
