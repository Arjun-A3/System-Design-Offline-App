import type { CriterionMark, PerformanceGrade } from '../curriculum/types';

const WEIGHT: Record<CriterionMark, number> = {
  understood_independently: 1,
  understood_with_hint: 0.6,
  not_understood: 0,
};

/** Self-assessed coverage from 0 to 100. This is not an automated grade of the written answer. */
export function rubricScore(marks: CriterionMark[]): number {
  if (marks.length === 0) return 0;
  const total = marks.reduce((sum, mark) => sum + WEIGHT[mark], 0);
  return Math.round((total / marks.length) * 100);
}

export function classifyPerformance(input: {
  marks: CriterionMark[];
  confidence: number;
  hintsUsed: number;
  referenceRevealed: boolean;
}): { grade: PerformanceGrade; score: number } {
  const score = rubricScore(input.marks);
  const anyGap = input.marks.some((mark) => mark === 'not_understood');
  if (anyGap || score < 50 || input.confidence <= 2) {
    return { grade: 'struggle', score };
  }
  const assisted =
    input.hintsUsed > 0 ||
    input.referenceRevealed ||
    input.marks.some((mark) => mark === 'understood_with_hint');
  if (score < 80 || input.confidence <= 3 || assisted) {
    return { grade: 'shaky', score };
  }
  return { grade: 'solid', score };
}

export function assertConfidence(confidence: number): void {
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
    throw new Error('Confidence must be an integer from 1 to 5.');
  }
}
