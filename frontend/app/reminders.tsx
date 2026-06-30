import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, font, radius, spacing } from '@/src/theme';
import { useToast } from '@/src/toast';
import {
  createReminder,
  deleteReminder,
  getReminders,
  markReminderDone,
  REMINDER_PRESETS,
  type LocalReminder,
  type ReminderKind,
} from '@/src/reminders';

const ICONS: Record<ReminderKind, keyof typeof Feather.glyphMap> = {
  training: 'book-open',
  funding: 'file-text',
  opportunities: 'compass',
};

const LABELS: Record<ReminderKind, string> = {
  training: 'Formation',
  funding: 'Financement',
  opportunities: 'Opportunités',
};

function formatDueAt(timestamp: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function Reminders() {
  const [items, setItems] = useState<LocalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const load = useCallback(async () => {
    setItems(await getReminders());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const schedule = async (preset: typeof REMINDER_PRESETS[number]) => {
    await createReminder(preset);
    await load();
    Haptics.selectionAsync().catch(() => {});
    toast.show(`Rappel programmé : ${preset.title}.`, 'success');
  };

  const done = async (reminder: LocalReminder) => {
    await markReminderDone(reminder.reminder_id);
    await load();
    toast.show('Rappel marqué comme terminé.', 'success');
  };

  const remove = async (reminder: LocalReminder) => {
    await deleteReminder(reminder.reminder_id);
    await load();
  };

  const pending = items.filter((item) => !item.done_at);
  const completed = items.filter((item) => item.done_at);

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="reminders-screen">
      <View style={styles.topbar}>
        <Pressable testID="reminders-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rappels</Text>
          <Text style={styles.subtitle}>{pending.length} rappel(s) actif(s)</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80 + insets.bottom }}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Planifier une action</Text>
            <Text style={styles.heroText}>
              Les rappels s&apos;affichent dans l&apos;app à l&apos;échéance, et sur web comme notification navigateur si elle est autorisée.
            </Text>
          </View>

          <View style={styles.presets}>
            {REMINDER_PRESETS.map((preset) => (
              <Pressable
                key={preset.kind}
                testID={`create-reminder-${preset.kind}`}
                onPress={() => schedule(preset)}
                style={styles.presetCard}
              >
                <View style={styles.presetIcon}>
                  <Feather name={ICONS[preset.kind]} size={19} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetSub}>
                    Dans {preset.delayHours / 24 >= 1 ? `${preset.delayHours / 24} jour(s)` : `${preset.delayHours} h`}
                  </Text>
                </View>
                <Feather name="plus" size={18} color={colors.brandPrimary} />
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>À venir</Text>
          {pending.length === 0 ? (
            <Text style={styles.empty}>Aucun rappel actif.</Text>
          ) : (
            pending.map((reminder) => (
              <View key={reminder.reminder_id} style={styles.reminderCard}>
                <View style={styles.reminderIcon}>
                  <Feather name={ICONS[reminder.kind]} size={17} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kind}>{LABELS[reminder.kind]}</Text>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <Text style={styles.reminderMessage}>{reminder.message}</Text>
                  <Text style={styles.due}>Prévu le {formatDueAt(reminder.due_at)}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    testID={`done-reminder-${reminder.reminder_id}`}
                    onPress={() => done(reminder)}
                    style={styles.smallBtn}
                  >
                    <Feather name="check" size={16} color={colors.success} />
                  </Pressable>
                  <Pressable
                    testID={`delete-reminder-${reminder.reminder_id}`}
                    onPress={() => remove(reminder)}
                    style={styles.smallBtn}
                  >
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {completed.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Terminés</Text>
              {completed.slice(0, 5).map((reminder) => (
                <View key={reminder.reminder_id} style={[styles.reminderCard, styles.doneCard]}>
                  <View style={styles.reminderIcon}>
                    <Feather name="check-circle" size={17} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.due}>Terminé</Text>
                  </View>
                  <Pressable onPress={() => remove(reminder)} style={styles.smallBtn}>
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  hero: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTitle: { color: colors.onBrandTertiary, fontSize: font.lg, fontWeight: '500' },
  heroText: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 20, marginTop: spacing.sm },
  presets: { gap: spacing.md, marginBottom: spacing.lg },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  presetIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  presetSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginVertical: spacing.md },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center', padding: spacing.xl },
  reminderCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  doneCard: { opacity: 0.75 },
  reminderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500', marginBottom: 2 },
  reminderTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  reminderMessage: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 18, marginTop: spacing.xs },
  due: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: spacing.sm },
  actions: { gap: spacing.sm },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
