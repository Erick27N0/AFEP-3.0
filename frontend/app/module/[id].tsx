import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/src/api';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';
import { saveModule, getModule, removeModule } from '@/src/offline';

type Section = { title: string; content: string };
type ModuleDetail = {
  module_id: string;
  title: string;
  summary: string;
  duration: string;
  icon: string;
  sections: Section[];
};

export default function ModuleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    // Try cache first
    const cached = await getModule(id);
    if (cached) {
      setData(cached);
      setOffline(true);
      setFromCache(true);
      setLoading(false);
    }
    // Then try network to refresh
    try {
      const fresh = await apiFetch(`/training/modules/${id}`);
      setData(fresh);
      setFromCache(false);
      // if cached, keep in sync silently
      if (cached) {
        await saveModule(fresh);
      }
    } catch (e) {
      if (!cached) {
        toast.show("Impossible de charger ce module. Téléchargez-le pour le consulter hors ligne.");
      }
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    if (!data) return;
    setBusy(true);
    try {
      if (offline) {
        await removeModule(data.module_id);
        setOffline(false);
        Haptics.selectionAsync().catch(() => {});
      } else {
        await saveModule(data);
        setOffline(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="module-detail">
      <View style={styles.topbar}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.topbarTitle}>Formation</Text>
        {data ? (
          <Pressable
            testID="download-toggle"
            onPress={handleDownload}
            disabled={busy}
            style={styles.iconBtn}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <Feather
                name={offline ? 'check-circle' : 'download'}
                size={20}
                color={offline ? colors.success : colors.brandPrimary}
              />
            )}
          </Pressable>
        ) : <View style={styles.iconBtn} />}
      </View>
      {loading && !data ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Module indisponible hors ligne.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
          {offline && (
            <View style={styles.offlineBadge} testID="offline-badge">
              <Feather name="download-cloud" size={14} color={colors.success} />
              <Text style={styles.offlineText}>
                Disponible hors ligne{fromCache ? ' (mode hors connexion)' : ''}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={13} color={colors.onSurfaceTertiary} />
            <Text style={styles.duration}>{data.duration}</Text>
          </View>
          <Text style={styles.summary}>{data.summary}</Text>
          {data.sections.map((s, i) => (
            <View key={i} style={styles.section}>
              <View style={styles.numBadge}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionContent}>{s.content}</Text>
            </View>
          ))}
          <Pressable
            testID="download-button"
            style={[styles.downloadBtn, offline && { backgroundColor: colors.surfaceSecondary }]}
            onPress={handleDownload}
            disabled={busy}
          >
            <Feather
              name={offline ? 'trash-2' : 'download'}
              size={18}
              color={offline ? colors.error : colors.onBrandPrimary}
            />
            <Text style={[styles.downloadText, offline && { color: colors.error }]}>
              {offline ? 'Retirer du téléchargement' : 'Télécharger pour hors ligne'}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  offlineText: { color: colors.success, fontSize: font.sm, fontWeight: '500' },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500', marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  duration: { color: colors.onSurfaceTertiary, fontSize: font.sm },
  summary: { color: colors.onSurfaceSecondary, fontSize: font.lg, lineHeight: 24, marginBottom: spacing.xl },
  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  numBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  numText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '500' },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: spacing.sm },
  sectionContent: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 22 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    minHeight: 56,
  },
  downloadText: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
});
