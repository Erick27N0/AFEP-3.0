import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDERS_KEY = 'local_reminders';

export type ReminderKind = 'training' | 'funding' | 'opportunities';

export type LocalReminder = {
  reminder_id: string;
  kind: ReminderKind;
  title: string;
  message: string;
  due_at: number;
  created_at: number;
  done_at: number | null;
  notified_at: number | null;
};

export const REMINDER_PRESETS: {
  kind: ReminderKind;
  title: string;
  message: string;
  delayHours: number;
}[] = [
  {
    kind: 'training',
    title: 'Continuer une formation',
    message: 'Reprenez un module et avancez dans votre parcours.',
    delayHours: 24,
  },
  {
    kind: 'funding',
    title: 'Finaliser un pitch',
    message: 'Complétez votre demande de financement pendant que les idées sont fraîches.',
    delayHours: 48,
  },
  {
    kind: 'opportunities',
    title: 'Revoir les opportunités',
    message: 'Consultez les opportunités locales et choisissez une piste à tester.',
    delayHours: 72,
  },
];

export async function getReminders(): Promise<LocalReminder[]> {
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  const reminders = raw ? JSON.parse(raw) as LocalReminder[] : [];
  return reminders.sort((a, b) => a.due_at - b.due_at);
}

async function saveReminders(reminders: LocalReminder[]) {
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export async function createReminder(input: {
  kind: ReminderKind;
  title: string;
  message: string;
  delayHours: number;
}) {
  const reminders = await getReminders();
  const now = Date.now();
  const reminder: LocalReminder = {
    reminder_id: `rem_${now}_${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    title: input.title,
    message: input.message,
    due_at: now + input.delayHours * 60 * 60 * 1000,
    created_at: now,
    done_at: null,
    notified_at: null,
  };
  reminders.push(reminder);
  await saveReminders(reminders);
  return reminder;
}

export async function markReminderDone(reminderId: string) {
  const now = Date.now();
  const reminders = await getReminders();
  await saveReminders(reminders.map((reminder) => (
    reminder.reminder_id === reminderId ? { ...reminder, done_at: now } : reminder
  )));
}

export async function deleteReminder(reminderId: string) {
  const reminders = await getReminders();
  await saveReminders(reminders.filter((reminder) => reminder.reminder_id !== reminderId));
}

export async function getDueReminders(now = Date.now()) {
  const reminders = await getReminders();
  return reminders.filter((reminder) => (
    !reminder.done_at && !reminder.notified_at && reminder.due_at <= now
  ));
}

export async function markRemindersNotified(reminderIds: string[]) {
  if (reminderIds.length === 0) return;
  const now = Date.now();
  const ids = new Set(reminderIds);
  const reminders = await getReminders();
  await saveReminders(reminders.map((reminder) => (
    ids.has(reminder.reminder_id) ? { ...reminder, notified_at: now } : reminder
  )));
}
