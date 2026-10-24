import type { Concept, CurriculumDay, LessonSession, Phase, Resource } from './types';
import { PHASE_IDS } from './types';
import { sessionSortKey } from './ids';

export function validateCurriculum(input: {
  phases: readonly Phase[];
  days: readonly CurriculumDay[];
  concepts: readonly Concept[];
  resources: readonly Resource[];
}): string[] {
  const errors: string[] = [];
  const { phases, days, concepts, resources } = input;
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const sessions = new Map<string, LessonSession>();

  if (phases.length !== PHASE_IDS.length) errors.push('Phase list does not match the required phases.');
  phases.forEach((phase, index) => {
    if (phase.id !== PHASE_IDS[index] || phase.order !== index + 1) {
      errors.push(`Phase ${phase.id} is out of order.`);
    }
  });

  if (days.length !== 210) errors.push(`Expected 210 days, found ${days.length}.`);
  const seenConcept = new Set<string>();
  for (const concept of concepts) {
    if (seenConcept.has(concept.id)) errors.push(`Duplicate concept ${concept.id}.`);
    seenConcept.add(concept.id);
    if (!concept.summary.trim() || !concept.title.trim()) errors.push(`Concept ${concept.id} is empty.`);
  }
  const seenResource = new Set<string>();
  for (const resource of resources) {
    if (seenResource.has(resource.id)) errors.push(`Duplicate resource ${resource.id}.`);
    seenResource.add(resource.id);
    if (!resource.url.startsWith('https://')) errors.push(`Resource ${resource.id} needs an https URL.`);
    if (!resource.summary.trim() || resource.questions.length === 0) errors.push(`Resource ${resource.id} is incomplete.`);
  }

  days.forEach((day, index) => {
    if (day.number !== index + 1) errors.push(`Day ${day.id} is not contiguous.`);
    if (day.id !== `day.${String(day.number).padStart(3, '0')}`) errors.push(`Day id ${day.id} is unstable.`);
    for (const session of [day.morning, day.evening]) {
      if (sessions.has(session.id)) errors.push(`Duplicate session ${session.id}.`);
      sessions.set(session.id, session);
      if (session.dayNumber !== day.number || session.phaseId !== day.phaseId) {
        errors.push(`Session ${session.id} does not match its day.`);
      }
      const expectedId = `day.${String(day.number).padStart(3, '0')}.${session.slot}`;
      if (session.id !== expectedId) errors.push(`Session ${session.id} breaks the id scheme.`);
      if (session.conceptIds.length === 0) errors.push(`Session ${session.id} has no concept.`);
      if (session.objectives.length === 0 || session.objectives.some((objective) => !objective.trim())) {
        errors.push(`Session ${session.id} needs objectives.`);
      }
      for (const conceptId of session.conceptIds) {
        if (!conceptIds.has(conceptId)) errors.push(`Session ${session.id} references unknown concept ${conceptId}.`);
      }
      for (const resourceId of session.resourceIds) {
        if (!resourceIds.has(resourceId)) errors.push(`Session ${session.id} references unknown resource ${resourceId}.`);
      }
    }
    const morningConcepts = new Set(day.morning.conceptIds);
    if (!day.evening.conceptIds.some((conceptId) => morningConcepts.has(conceptId))) {
      errors.push(`Evening ${day.evening.id} does not reinforce the morning concept.`);
    }
    if (index > 0) {
      const previous = days[index - 1];
      if (PHASE_IDS.indexOf(day.phaseId) < PHASE_IDS.indexOf(previous.phaseId)) {
        errors.push(`Phase order moves backward at ${day.id}.`);
      }
    }
  });

  for (const phaseId of PHASE_IDS) {
    if (!days.some((day) => day.phaseId === phaseId)) errors.push(`Phase ${phaseId} has no days.`);
  }

  const authored = days.filter((day) => day.morning.depth === 'full' && day.evening.depth === 'full');
  if (authored.length !== 14 || authored.some((day, index) => day.number !== index + 1)) {
    errors.push('The first 14 days must be the authored prefix.');
  }
  for (const day of days) {
    const expectFull = day.number <= 14;
    for (const session of [day.morning, day.evening]) {
      if (expectFull && session.depth !== 'full') errors.push(`${session.id} should be fully authored.`);
      if (!expectFull && session.depth !== 'planned') errors.push(`${session.id} should stay planned.`);
      if (session.depth === 'full') {
        if (session.durationMinutes < 10 || session.durationMinutes > 25) {
          errors.push(`${session.id} duration is outside 10–25 minutes.`);
        }
        const fields = [
          session.whyItMatters,
          session.explanation,
          session.question,
          session.referenceSolution,
          session.engineeringContext,
        ];
        if (fields.some((field) => field.trim().length < 40)) errors.push(`${session.id} content is too thin.`);
        if (session.hints.length < 2 || session.rubric.length < 2) errors.push(`${session.id} needs hints and a rubric.`);
        const rubricIds = new Set<string>();
        for (const criterion of session.rubric) {
          if (rubricIds.has(criterion.id)) errors.push(`Duplicate rubric ${criterion.id}.`);
          rubricIds.add(criterion.id);
          if (!session.conceptIds.includes(criterion.conceptId)) {
            errors.push(`Rubric ${criterion.id} uses a concept outside the session.`);
          }
        }
      }
    }
  }

  for (const session of sessions.values()) {
    for (const prerequisiteId of session.prerequisiteSessionIds) {
      const prerequisite = sessions.get(prerequisiteId);
      if (!prerequisite) {
        errors.push(`${session.id} depends on missing ${prerequisiteId}.`);
        continue;
      }
      if (sessionSortKey(prerequisite.dayNumber, prerequisite.slot) >= sessionSortKey(session.dayNumber, session.slot)) {
        errors.push(`${session.id} depends on a later session ${prerequisiteId}.`);
      }
    }
    if (session.slot === 'evening' && !session.prerequisiteSessionIds.includes(session.id.replace('.evening', '.morning'))) {
      errors.push(`${session.id} must depend on its morning session.`);
    }
    if (session.dayNumber > 1 && session.slot === 'morning') {
      const previousEvening = `day.${String(session.dayNumber - 1).padStart(3, '0')}.evening`;
      if (!session.prerequisiteSessionIds.includes(previousEvening)) {
        errors.push(`${session.id} must depend on ${previousEvening}.`);
      }
    }
  }

  for (const resource of resources) {
    for (const lessonId of resource.lessonIds) {
      if (!sessions.has(lessonId)) errors.push(`Resource ${resource.id} points at unknown lesson ${lessonId}.`);
    }
  }

  return errors;
}
