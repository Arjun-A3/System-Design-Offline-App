export const PHASE_IDS = [
  'foundations',
  'web',
  'data',
  'caching',
  'distributed',
  'messaging',
  'scalability',
  'reliability',
  'security',
  'cloud',
  'advanced-data',
  'architecture',
  'case-studies',
  'judgment',
] as const;

export type PhaseId = (typeof PHASE_IDS)[number];

export type SessionSlot = 'morning' | 'evening';
export type Difficulty = 'foundational' | 'intermediate' | 'advanced';
export type ContentDepth = 'full' | 'planned';
export type CriterionMark =
  | 'understood_independently'
  | 'understood_with_hint'
  | 'not_understood';
export type MasteryStatus = 'unseen' | 'learning' | 'weak' | 'reviewing' | 'mastered';
export type PerformanceGrade = 'struggle' | 'shaky' | 'solid';

export type RubricCriterion = {
  id: string;
  description: string;
  conceptId: string;
};

export type Misconception = {
  id: string;
  statement: string;
  correction: string;
};

type SessionBase = {
  id: string;
  dayId: string;
  dayNumber: number;
  slot: SessionSlot;
  title: string;
  phaseId: PhaseId;
  conceptIds: string[];
  prerequisiteSessionIds: string[];
  objectives: string[];
  durationMinutes: number;
  difficulty: Difficulty;
  resourceIds: string[];
};

export type FullSession = SessionBase & {
  depth: 'full';
  whyItMatters: string;
  explanation: string;
  question: string;
  hints: string[];
  expectedOutline: string[];
  referenceSolution: string;
  rubric: RubricCriterion[];
  misconceptions: Misconception[];
  engineeringContext: string;
  extensionQuestions: string[];
  acceptableAlternatives: string[];
  tradeoffs: string[];
  commonMistakes: string[];
  followUps: string[];
};

export type PlannedSession = SessionBase & {
  depth: 'planned';
  intent: string;
};

export type LessonSession = FullSession | PlannedSession;

export type CurriculumDay = {
  id: string;
  number: number;
  phaseId: PhaseId;
  title: string;
  morning: LessonSession;
  evening: LessonSession;
};

export type Phase = {
  id: PhaseId;
  order: number;
  title: string;
  summary: string;
  topics: string[];
};

export type Concept = {
  id: string;
  title: string;
  summary: string;
  phaseId: PhaseId;
};

export type Resource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** Included only when the publication date was verified. */
  published?: string;
  difficulty: Difficulty;
  summary: string;
  questions: string[];
  lessonIds: string[];
  topicTags: string[];
};

export const CURRICULUM_VERSION = '2026.10.1';
export const AUTHORED_DAY_COUNT = 14;
export const PLANNED_DAY_COUNT = 210;
