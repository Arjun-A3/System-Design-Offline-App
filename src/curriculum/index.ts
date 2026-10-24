import { foundationConcepts } from './concepts';
import { days01to04 } from './content/days01to04';
import { days05to09 } from './content/days05to09';
import { days10to14 } from './content/days10to14';
import { phases } from './phases';
import { plannedConcepts, plannedDays } from './roadmap';
import { resources } from './resources';
import type { Concept, CurriculumDay, LessonSession, Phase, Resource } from './types';
import { AUTHORED_DAY_COUNT, CURRICULUM_VERSION } from './types';
import { validateCurriculum } from './validate';

export const curriculumDays: CurriculumDay[] = [...days01to04, ...days05to09, ...days10to14, ...plannedDays];

export const curriculumPhases: Phase[] = phases;

export const curriculumConcepts: Concept[] = [...foundationConcepts, ...plannedConcepts];

export const curriculumResources: Resource[] = resources;

export const curriculumSessions: LessonSession[] = curriculumDays.flatMap((day) => [day.morning, day.evening]);

export const sessionsById = new Map(curriculumSessions.map((session) => [session.id, session]));

export const conceptsById = new Map(curriculumConcepts.map((concept) => [concept.id, concept]));

export const resourcesById = new Map(curriculumResources.map((resource) => [resource.id, resource]));

export const phasesById = new Map(curriculumPhases.map((phase) => [phase.id, phase]));

const curriculumErrors = validateCurriculum({
  phases: curriculumPhases,
  days: curriculumDays,
  concepts: curriculumConcepts,
  resources: curriculumResources,
});

if (curriculumErrors.length > 0) {
  throw new Error(`Curriculum is invalid:\n${curriculumErrors.join('\n')}`);
}

export function curriculumFingerprint(days: readonly CurriculumDay[] = curriculumDays): string {
  const material = days
    .map(
      (day) =>
        `${day.id}|${day.morning.id}|${day.morning.depth}|${day.morning.title}|${day.evening.id}|${day.evening.depth}|${day.evening.title}`,
    )
    .join('\n');
  let hash = 2166136261;
  for (let index = 0; index < material.length; index += 1) {
    hash ^= material.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export const contentHash = curriculumFingerprint();

export function authoredDays(): CurriculumDay[] {
  return curriculumDays.slice(0, AUTHORED_DAY_COUNT);
}

export { CURRICULUM_VERSION };
