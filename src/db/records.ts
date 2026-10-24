export type SessionStatus = 'in_progress' | 'completed' | 'postponed';

export type SessionRecord = {
  sessionId: string;
  status: SessionStatus;
  answerDraft: string;
  hintsRevealed: number;
  referenceRevealed: boolean;
  notes: string;
  bookmarked: boolean;
  startedAt: string | null;
  completedAt: string | null;
  postponedAt: string | null;
  postponeCount: number;
  lastConfidence: number | null;
  updatedAt: string;
};

export type AssessmentRecord = {
  id: number;
  sessionId: string;
  rubricJson: string;
  rubricScore: number;
  confidence: number;
  hintsUsed: number;
  referenceRevealed: boolean;
  grade: 'struggle' | 'shaky' | 'solid';
  createdAt: string;
};

export type MasteryRecord = {
  conceptId: string;
  attemptCount: number;
  lastRubricScore: number | null;
  lastConfidence: number | null;
  hintUsageCount: number;
  lastAttemptAt: string | null;
  lastSuccessfulAt: string | null;
  nextReviewAt: string | null;
  intervalDays: number;
  intervalIndex: number;
  masteryStatus: 'unseen' | 'learning' | 'weak' | 'reviewing' | 'mastered';
  updatedAt: string;
};

export type RevisionRecord = {
  id: number;
  conceptId: string;
  sessionId: string | null;
  dueOn: string;
  reason: 'struggle' | 'prerequisite' | 'interval';
  status: 'scheduled' | 'completed' | 'dismissed';
  createdAt: string;
  completedAt: string | null;
};

export type ActivityRecord = {
  localDate: string;
  completedSessions: number;
  completedRevisions: number;
  restDay: boolean;
  updatedAt: string;
};

export type ActivityEventRecord = {
  id: number;
  localDate: string;
  kind: 'session_completed' | 'revision_completed' | 'rest_marked';
  refId: string | null;
  title: string;
  createdAt: string;
};

export type MisconceptionRecord = {
  id: number;
  sessionId: string;
  conceptId: string;
  misconceptionId: string;
  statement: string;
  notedOn: string;
  resolvedOn: string | null;
};

export type NotificationRecord = {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  lastReconciledAt: string | null;
  timezone: string | null;
  updatedAt: string;
};

export type SettingsRecord = {
  theme: 'system' | 'light' | 'dark';
  fontScale: 'compact' | 'default' | 'large';
  reduceMotion: boolean;
  updatedAt: string;
};

export type LearningSnapshot = {
  sessions: SessionRecord[];
  assessments: AssessmentRecord[];
  mastery: MasteryRecord[];
  revisions: RevisionRecord[];
  activity: ActivityRecord[];
  events: ActivityEventRecord[];
  misconceptions: MisconceptionRecord[];
  notifications: NotificationRecord;
  settings: SettingsRecord;
  curriculumVersion: string;
  contentHash: string;
};
