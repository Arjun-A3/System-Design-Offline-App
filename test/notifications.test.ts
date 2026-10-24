import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EVENING_NOTIFICATION_ID,
  MORNING_NOTIFICATION_ID,
  TEST_NOTIFICATION_ID,
  desiredReminders,
  reconcileReminders,
  type ReminderPreferences,
} from '../src/notifications/plan.ts';

const prefs: ReminderPreferences = {
  morningEnabled: true,
  morningHour: 8,
  morningMinute: 0,
  eveningEnabled: true,
  eveningHour: 20,
  eveningMinute: 15,
};

test('defaults schedule two distinct local reminders without answer text', () => {
  const desired = desiredReminders(prefs, {
    morningBody: 'Morning: Processes and isolation',
    eveningBody: 'Evening: Choose a crash boundary',
  });
  assert.equal(desired.length, 2);
  assert.equal(desired[0]?.identifier, MORNING_NOTIFICATION_ID);
  assert.equal(desired[1]?.hour, 20);
  assert.equal(desired[0]?.title, "Today's system design challenge is ready.");
  assert.equal(desired[1]?.title, "Time to apply today's concept.");
  assert.equal(desired.some((item) => item.body.includes('reference')), false);
});

test('preference changes cancel the old reminder and schedule the replacement once', () => {
  const desired = desiredReminders(prefs, { morningBody: 'Morning', eveningBody: 'Evening' });
  const plan = reconcileReminders(
    [
      { identifier: MORNING_NOTIFICATION_ID, hour: 7, minute: 0, slot: 'morning' },
      { identifier: EVENING_NOTIFICATION_ID, hour: 20, minute: 15, slot: 'evening' },
      { identifier: 'legacy-morning', hour: 8, minute: 0, slot: 'morning' },
    ],
    desired,
    { permissionGranted: true, forceReschedule: false },
  );
  assert.ok(plan.cancel.includes(MORNING_NOTIFICATION_ID));
  assert.ok(plan.cancel.includes('legacy-morning'));
  assert.equal(plan.cancel.includes(EVENING_NOTIFICATION_ID), false);
  assert.equal(plan.schedule.filter((item) => item.identifier === MORNING_NOTIFICATION_ID).length, 1);
  assert.equal(plan.schedule.some((item) => item.identifier === EVENING_NOTIFICATION_ID), false);
});

test('a timezone change reschedules matching clocks and denied permission schedules nothing', () => {
  const desired = desiredReminders({ ...prefs, eveningEnabled: false }, { morningBody: 'Morning', eveningBody: 'Evening' });
  const moved = reconcileReminders(
    [{ identifier: MORNING_NOTIFICATION_ID, hour: 8, minute: 0, slot: 'morning' }],
    desired,
    { permissionGranted: true, forceReschedule: true },
  );
  assert.ok(moved.cancel.includes(MORNING_NOTIFICATION_ID));
  assert.equal(moved.schedule.length, 1);
  const denied = reconcileReminders(
    [{ identifier: MORNING_NOTIFICATION_ID, hour: 8, minute: 0, slot: 'morning' }, { identifier: TEST_NOTIFICATION_ID, slot: 'test' }],
    desired,
    { permissionGranted: false, forceReschedule: false },
  );
  assert.deepEqual(denied.schedule, []);
  assert.ok(denied.cancel.includes(MORNING_NOTIFICATION_ID));
  assert.equal(denied.cancel.includes(TEST_NOTIFICATION_ID), false);
});
