import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { colors, font, radius, spacing } from '@/src/theme';
import { useToast } from '@/src/toast';
import {
  getFavoriteList,
  getIndex,
  getModuleProgress,
  type FavoriteItem,
} from '@/src/offline';
import { getReminders, type LocalReminder } from '@/src/reminders';

type ModuleSummary = {
  module_id: string;
  title: string;
  duration: string;
};

type Group = {
  group_id: string;
  name: string;
  location: string;
  members: string[];
  description: string;
};

type FundingRequest = {
  request_id: string;
  project_name: string;
  sector: string;
  target_amount: string;
  status: string;
  ai_generated?: boolean;
  created_at?: string;
};

type GroupMessage = {
  message_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

function formatDateTime(value?: string) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatReminderTime(ts: number) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export default function PersonalDashboard() {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [progress, setProgress] = useState<Record<string, { completed: boolean }>>({});
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [reminders, setReminders] = useState<LocalReminder[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [funding, setFunding] = useState<FundingRequest[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [modulesData, favoriteList, remindersData, groupMine, fundingMine] = await Promise.all([
        apiFetch('/training/modules'),
        getFavoriteList(),
        getReminders(),
        apiFetch('/groups/mine'),
        apiFetch('/funding/mine'),
      ]);

      const moduleList = modulesData as ModuleSummary[];
      const [savedProgress, savedDownloads] = await Promise.all([
        Promise.all(moduleList.map((mod) => getModuleProgress(mod.module_id))),
        getIndex(),
      ]);

      setModules(moduleList);
      setProgress(
        moduleList.reduce<Record<string, { completed: boolean }>>((acc, mod, idx) => {
          acc[mod.module_id] = { completed: Boolean(savedProgress[idx]?.completed) };
          return acc;
        }, {})
      );
      setDownloadedIds(savedDownloads);
      setFavorites(favoriteList);
      setReminders(remindersData);
      setGroup(groupMine.group || null);
      setFunding((fundingMine as FundingRequest[]) || []);

      if (groupMine.group) {
        try {
          const recentMessages = await apiFetch('/groups/mine/messages');
          setMessages((recentMessages as GroupMessage[]).slice(0, 3));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch {
      toast.show("Impossible de charger le tableau de bord personnel.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completedCount = modules.filter((mod) => progress[mod.module_id]?.completed).length;
  const progressPercent = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const activeReminders = reminders.filter((item) => !item.done_at).length;
  const topFavorite = favorites[0];
  const latestFunding = funding[0];
  const nextReminder = reminders.filter((item) => !item.done_at).sort((a, b) => a.due_at - b.due_at)[0];
  const latestMessage = messages[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="dashboard-screen">
      <View style={styles.topbar}>
        <Pressable testID="dashboard-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mon tableau de bord</Text>
          <Text style={styles.subtitle}>Vue synthétique de votre progression</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 84 + insets.bottom }}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Progression personnelle</Text>
            <Text style={styles.heroTitle}>
              {completedCount}/{modules.length} formations terminées
            </Text>
            <Text style={styles.heroText}>
              {activeReminders} rappel(s), {favorites.length} favori(s), {downloadedIds.length} module(s) hors ligne.
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <Pressable style={styles.statCard} onPress={() => router.push('/favorites' as never)}>
              <Feather name="star" size={18} color={colors.brandSecondary} />
              <Text style={styles.statValue}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => router.push('/reminders' as never)}>
              <Feather name="bell" size={18} color={colors.info} />
              <Text style={styles.statValue}>{activeReminders}</Text>
              <Text style={styles.statLabel}>Rappels actifs</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => router.push('/formations' as never)}>
              <Feather name="book-open" size={18} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{completedCount}</Text>
              <Text style={styles.statLabel}>Formations terminées</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => router.push('/groupe' as never)}>
              <Feather name="users" size={18} color={colors.success} />
              <Text style={styles.statValue}>{group ? group.members.length : 0}</Text>
              <Text style={styles.statLabel}>{group ? 'Membres du groupe' : 'Pas de groupe'}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/search' as never)}>
                <Feather name="search" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.actionText}>Rechercher</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/financement' as never)}>
                <Feather name="file-text" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.actionText}>Pitch</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/reminders' as never)}>
                <Feather name="bell" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.actionText}>Rappels</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parcours</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Téléchargements</Text>
              <Text style={styles.metricValue}>{downloadedIds.length}/{modules.length}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Progression</Text>
              <Text style={styles.metricValue}>{progressPercent}%</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Dernier favori</Text>
              <Text style={styles.metricValue} numberOfLines={1}>{topFavorite?.title || 'Aucun'}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Prochain rappel</Text>
              <Text style={styles.metricValue} numberOfLines={1}>{nextReminder ? formatReminderTime(nextReminder.due_at) : 'Aucun'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dernière demande</Text>
            {latestFunding ? (
              <View style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Feather name={latestFunding.ai_generated ? 'zap' : 'file-text'} size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={2}>{latestFunding.project_name}</Text>
                  <Text style={styles.activitySub} numberOfLines={1}>
                    {latestFunding.sector} · {latestFunding.target_amount}
                  </Text>
                  <Text style={styles.activityMeta}>{latestFunding.status} · {formatDateTime(latestFunding.created_at)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.empty}>Aucune demande de financement.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Groupe</Text>
            {group ? (
              <View style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Feather name="users" size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{group.name}</Text>
                  <Text style={styles.activitySub} numberOfLines={1}>{group.location} · {group.members.length} membre(s)</Text>
                  <Text style={styles.activityMeta} numberOfLines={2}>{group.description}</Text>
                </View>
                <Pressable onPress={() => router.push('/groupe' as never)} style={styles.smallBtn}>
                  <Feather name="arrow-right" size={18} color={colors.brandPrimary} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.emptyCard} onPress={() => router.push('/groupe' as never)}>
                <Feather name="users" size={18} color={colors.onSurfaceTertiary} />
                <Text style={styles.emptyCardText}>Créer ou rejoindre un groupe</Text>
              </Pressable>
            )}
          </View>

          {latestMessage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dernier message du groupe</Text>
              <View style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Feather name="message-circle" size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{latestMessage.user_name}</Text>
                  <Text style={styles.activitySub} numberOfLines={2}>{latestMessage.content}</Text>
                  <Text style={styles.activityMeta}>{formatDateTime(latestMessage.created_at)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dernier rappel</Text>
            {nextReminder ? (
              <View style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Feather name="bell" size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{nextReminder.title}</Text>
                  <Text style={styles.activitySub}>{nextReminder.message}</Text>
                  <Text style={styles.activityMeta}>Prévu le {formatReminderTime(nextReminder.due_at)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.empty}>Aucun rappel planifié.</Text>
            )}
          </View>
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
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  heroLabel: { color: colors.brandSecondary, fontSize: font.sm, fontWeight: '500', marginBottom: spacing.sm },
  heroTitle: { color: colors.onSurfaceInverse, fontSize: font.xxl, fontWeight: '500' },
  heroText: { color: colors.onSurfaceInverse, opacity: 0.78, fontSize: font.base, lineHeight: 20, marginTop: spacing.sm },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brandSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md },
  statCard: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 118,
  },
  statValue: { color: colors.onSurface, fontSize: font.xl, fontWeight: '500', marginTop: spacing.md },
  statLabel: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 4 },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
    minHeight: 46,
  },
  actionText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '500' },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  metricLabel: { color: colors.onSurfaceSecondary, fontSize: font.base, flex: 1 },
  metricValue: { color: colors.onSurface, fontSize: font.base, fontWeight: '500', flex: 1, textAlign: 'right' },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  activitySub: { color: colors.onSurfaceSecondary, fontSize: font.sm, marginTop: 3 },
  activityMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 4 },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyCardText: { color: colors.onSurfaceSecondary, fontSize: font.base, fontWeight: '500' },
});
