import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { validateBackup } from '@/backup/validate';
import { contentHash, CURRICULUM_VERSION, sessionsById } from '@/curriculum';
import type { CriterionMark, FullSession, LessonSession } from '@/curriculum/types';
import type { DbAdapter } from '@/db/adapter';
import { openAppDatabase } from '@/db/open';
import type { LearningSnapshot, NotificationRecord, SettingsRecord } from '@/db/records';
import {
  applyAssessment,
  exportBackup,
  importBackup,
  loadSnapshot,
  postponeSession,
  resetProgress,
  revealReference,
  saveDraft,
  saveHints,
  saveNotes,
  saveNotificationPreferences,
  saveSettings,
  seedDefaults,
  setBookmark,
  setRestDay,
  updateCurriculumMeta,
} from '@/db/repository';
import { localDateISO, localTimeZone } from '@/engine/dates';
import { planAssessment } from '@/engine/effects';
import { selectHome, selectProgress, selectRevision } from '@/engine/selectors';
import {
  readExactAlarmPermission,
  readNotificationPermission,
  reconcileScheduledReminders,
  requestExactAlarms,
  requestNotificationPermission,
  scheduleTestReminder,
  type PermissionState,
} from '@/notifications/native';
import { palettes, scaleFor, type Palette } from '@/ui/theme';

type AcademyValue = {
  ready: boolean;
  bootError: string | null;
  snapshot: LearningSnapshot | null;
  colors: Palette;
  scheme: 'light' | 'dark';
  fontScale: number;
  reduceMotion: boolean;
  permission: PermissionState;
  alarmsAllowed: boolean;
  home: ReturnType<typeof selectHome> | null;
  revision: ReturnType<typeof selectRevision> | null;
  progress: ReturnType<typeof selectProgress> | null;
  refresh: () => Promise<void>;
  saveAnswer: (sessionId: string, answer: string) => Promise<void>;
  revealHint: (sessionId: string, count: number) => Promise<void>;
  showReference: (sessionId: string) => Promise<void>;
  updateNotes: (sessionId: string, notes: string) => Promise<void>;
  toggleBookmark: (sessionId: string, bookmarked: boolean) => Promise<void>;
  postpone: (sessionId: string) => Promise<void>;
  submit: (session: FullSession, answer: string, marks: Record<string, CriterionMark>, confidence: number) => Promise<void>;
  restToday: (resting: boolean) => Promise<void>;
  updateSettings: (settings: Pick<SettingsRecord, 'theme' | 'fontScale' | 'reduceMotion'>) => Promise<void>;
  updateReminders: (prefs: NotificationRecord) => Promise<void>;
  allowReminders: () => Promise<PermissionState>;
  allowExactAlarms: () => Promise<boolean>;
  testReminder: () => Promise<void>;
  exportJson: () => Promise<string>;
  restoreJson: (text: string) => Promise<void>;
  clearProgress: () => Promise<void>;
};

const AcademyContext = createContext<AcademyValue | null>(null);

export function useAcademy(): AcademyValue {
  const value = useContext(AcademyContext);
  if (!value) throw new Error('The learning store is not available.');
  return value;
}

export function AcademyProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const dbRef = useRef<DbAdapter | null>(null);
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [alarmsAllowed, setAlarmsAllowed] = useState(true);
  const today = localDateISO(new Date());

  const syncReminders = useCallback(async (next: LearningSnapshot, force: boolean) => {
    const db = dbRef.current;
    if (!db) return;
    const currentPermission = await readNotificationPermission();
    setPermission(currentPermission);
    setAlarmsAllowed(await readExactAlarmPermission());
    const home = selectHome(next, localDateISO(new Date()));
    const timezone = localTimeZone();
    await reconcileScheduledReminders({
      preferences: {
        morningEnabled: next.notifications.morningEnabled,
        morningHour: next.notifications.morningHour,
        morningMinute: next.notifications.morningMinute,
        eveningEnabled: next.notifications.eveningEnabled,
        eveningHour: next.notifications.eveningHour,
        eveningMinute: next.notifications.eveningMinute,
      },
      morningBody: `Morning: ${home.morning.title}`,
      eveningBody: `Evening: ${home.evening.title}`,
      permission: currentPermission,
      forceReschedule: force || next.notifications.timezone !== timezone,
    });
    if (next.notifications.permissionStatus !== currentPermission || next.notifications.timezone !== timezone) {
      const updated: NotificationRecord = {
        ...next.notifications,
        permissionStatus: currentPermission,
        timezone,
        lastReconciledAt: new Date().toISOString(),
      };
      await saveNotificationPreferences(db, updated, new Date().toISOString());
      setSnapshot(await loadSnapshot(db));
    }
  }, []);

  const refresh = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setSnapshot(await loadSnapshot(db));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openAppDatabase();
        const now = new Date().toISOString();
        await seedDefaults(db, now);
        await updateCurriculumMeta(db, CURRICULUM_VERSION, contentHash, now);
        dbRef.current = db;
        const loaded = await loadSnapshot(db);
        if (cancelled) return;
        setSnapshot(loaded);
        setReady(true);
        try {
          await syncReminders(loaded, true);
        } catch {
          // The curriculum remains usable when the OS rejects reminder scheduling.
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : 'The local database could not be opened.');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncReminders]);

  const requireDb = () => {
    if (!dbRef.current) throw new Error('Local storage is not ready.');
    return dbRef.current;
  };

  const value = useMemo<AcademyValue>(() => {
    const settings = snapshot?.settings;
    const scheme =
      !settings || settings.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : settings.theme;
    return {
      ready,
      bootError,
      snapshot,
      colors: palettes[scheme],
      scheme,
      fontScale: scaleFor(settings?.fontScale ?? 'default'),
      reduceMotion: settings?.reduceMotion ?? false,
      permission,
      alarmsAllowed,
      home: snapshot ? selectHome(snapshot, today) : null,
      revision: snapshot ? selectRevision(snapshot, today) : null,
      progress: snapshot ? selectProgress(snapshot, today) : null,
      refresh,
      async saveAnswer(sessionId, answer) {
        await saveDraft(requireDb(), sessionId, answer, new Date().toISOString());
        await refresh();
      },
      async revealHint(sessionId, count) {
        await saveHints(requireDb(), sessionId, count, new Date().toISOString());
        await refresh();
      },
      async showReference(sessionId) {
        await revealReference(requireDb(), sessionId, new Date().toISOString());
        await refresh();
      },
      async updateNotes(sessionId, notes) {
        await saveNotes(requireDb(), sessionId, notes, new Date().toISOString());
        await refresh();
      },
      async toggleBookmark(sessionId, bookmarked) {
        await setBookmark(requireDb(), sessionId, bookmarked, new Date().toISOString());
        await refresh();
      },
      async postpone(sessionId) {
        await postponeSession(requireDb(), sessionId, new Date().toISOString());
        await refresh();
      },
      async submit(session, answer, marks, confidence) {
        const current = snapshot?.sessions.find((row) => row.sessionId === session.id);
        const record = current
          ? {
              status: current.status,
              notes: current.notes,
              bookmarked: current.bookmarked,
              startedAt: current.startedAt,
              completedAt: current.completedAt,
              postponedAt: current.postponedAt,
              postponeCount: current.postponeCount,
            }
          : null;
        const completed = new Set(
          (snapshot?.sessions ?? []).filter((row) => row.status === 'completed').map((row) => row.sessionId),
        );
        const plan = planAssessment({
          session,
          marks,
          confidence,
          answer,
          hintsRevealed: current?.hintsRevealed ?? 0,
          referenceRevealed: current?.referenceRevealed ?? false,
          today: localDateISO(new Date()),
          nowIso: new Date().toISOString(),
          existing: record,
          mastery: (snapshot?.mastery ?? [])
            .filter((row) => session.conceptIds.includes(row.conceptId))
            .map((row) => ({
              conceptId: row.conceptId,
              attemptCount: row.attemptCount,
              hintUsageCount: row.hintUsageCount,
              intervalIndex: row.intervalIndex,
              lastSuccessfulAt: row.lastSuccessfulAt,
            })),
          prerequisiteConceptIds: prerequisiteConcepts(session),
          incompletePrerequisiteIds: session.prerequisiteSessionIds.filter((id) => {
            const prerequisite = sessionsById.get(id);
            return prerequisite?.depth === 'full' && !completed.has(id);
          }),
        });
        const db = requireDb();
        await applyAssessment(db, plan, localDateISO(new Date()));
        const loaded = await loadSnapshot(db);
        setSnapshot(loaded);
        await syncReminders(loaded, true);
      },
      async restToday(resting) {
        await setRestDay(requireDb(), localDateISO(new Date()), resting, new Date().toISOString());
        await refresh();
      },
      async updateSettings(next) {
        await saveSettings(requireDb(), next, new Date().toISOString());
        await refresh();
      },
      async updateReminders(prefs) {
        await saveNotificationPreferences(requireDb(), prefs, new Date().toISOString());
        const loaded = await loadSnapshot(requireDb());
        setSnapshot(loaded);
        await syncReminders(loaded, true);
      },
      async allowReminders() {
        const granted = await requestNotificationPermission();
        setPermission(granted);
        if (granted === 'granted') setAlarmsAllowed(await requestExactAlarms());
        const loaded = await loadSnapshot(requireDb());
        setSnapshot(loaded);
        await syncReminders(loaded, true);
        return granted;
      },
      async allowExactAlarms() {
        const allowed = await requestExactAlarms();
        setAlarmsAllowed(allowed);
        const loaded = await loadSnapshot(requireDb());
        setSnapshot(loaded);
        await syncReminders(loaded, true);
        return allowed;
      },
      async testReminder() {
        await scheduleTestReminder();
      },
      async exportJson() {
        const backup = await exportBackup(requireDb(), CURRICULUM_VERSION, new Date().toISOString());
        return JSON.stringify(backup, null, 2);
      },
      async restoreJson(text) {
        const parsed = validateBackup(JSON.parse(text) as unknown, text.length);
        if (!parsed.ok) throw new Error(parsed.error);
        const db = requireDb();
        await importBackup(db, parsed.value);
        await updateCurriculumMeta(db, CURRICULUM_VERSION, contentHash, new Date().toISOString());
        const loaded = await loadSnapshot(db);
        setSnapshot(loaded);
        await syncReminders(loaded, true);
      },
      async clearProgress() {
        const db = requireDb();
        await resetProgress(db, new Date().toISOString());
        const loaded = await loadSnapshot(db);
        setSnapshot(loaded);
        await syncReminders(loaded, true);
      },
    };
  }, [alarmsAllowed, bootError, permission, ready, refresh, snapshot, syncReminders, system, today]);

  return <AcademyContext.Provider value={value}>{children}</AcademyContext.Provider>;
}

function prerequisiteConcepts(session: LessonSession) {
  const refs: { conceptId: string; sessionId: string }[] = [];
  for (const id of session.prerequisiteSessionIds) {
    const prerequisite = sessionsById.get(id);
    if (!prerequisite) continue;
    for (const conceptId of prerequisite.conceptIds) {
      refs.push({ conceptId, sessionId: prerequisite.id });
    }
  }
  return refs;
}
