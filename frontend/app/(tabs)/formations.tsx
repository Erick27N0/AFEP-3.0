import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/src/api';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';
import { getIndex, saveModule, getModule } from '@/src/offline';

type Module = {
  module_id: string;
  title: string;
  summary: string;
  icon: string;
  duration: string;
};

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  compass: 'compass',
  'file-text': 'file-text',
  wallet: 'credit-card',
  megaphone: 'send',
  users: 'users',
  'hand-coins': 'gift',
};

export default function Formations() {
  const [items, setItems] = useState<Module[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const loadDownloaded = useCallback(async () => {
    const idx = await getIndex();
    setDownloadedIds(idx);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/training/modules');
      setItems(data);
    } catch {
      const idx = await getIndex();
      const cached: Module[] = [];
      for (const mid of idx) {
        const m = await getModule(mid);
        if (m) cached.push({
          module_id: m.module_id,
          title: m.title,
          summary: m.summary,
          icon: m.icon,
          duration: m.duration,
        });
      }
      setItems(cached);
      if (cached.length === 0) {
        toast.show("Impossible de charger les formations. Aucun module hors ligne.");
      } else {
        toast.show(`Mode hors ligne : ${cached.length} module(s) disponibles.`, 'info');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    loadDownloaded();
  }, [load, loadDownloaded]);

  useFocusEffect(useCallback(() => { loadDownloaded(); }, [loadDownloaded]));

  const downloadAll = async () => {
    setDownloadingAll(true);
    try {
      for (const m of items) {
        if (downloadedIds.includes(m.module_id)) continue;
        const full = await apiFetch(`/training/modules/${m.module_id}`);
        await saveModule(full);
      }
      await loadDownloaded();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show(`${items.length} module(s) téléchargé(s).`, 'success');
    } catch (e) {
      toast.show("Téléchargement interrompu. Réessayez avec une meilleure connexion.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const allDownloaded = items.length > 0 && downloadedIds.length >= items.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="formations-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Formations</Text>
          <Text style={styles.subtitle}>
            {downloadedIds.length > 0
              ? `${downloadedIds.length} module(s) hors ligne`
              : 'Apprenez à votre rythme'}
          </Text>
        </View>
        {items.length > 0 && (
          <Pressable
            testID="download-all"
            style={[styles.dlAllBtn, allDownloaded && { backgroundColor: colors.surfaceSecondary }]}
            onPress={downloadAll}
            disabled={downloadingAll || allDownloaded}
          >
            {downloadingAll ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <>
                <Feather
                  name={allDownloaded ? 'check' : 'download'}
                  size={14}
                  color={allDownloaded ? colors.success : colors.brandPrimary}
                />
                <Text style={[styles.dlAllText, allDownloaded && { color: colors.success }]}>
                  {allDownloaded ? 'Tout enregistré' : 'Tout télécharger'}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune formation disponible hors ligne.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: 100 + insets.bottom,
          }}
        >
          <View style={styles.grid}>
            {items.map((m) => {
              const isDownloaded = downloadedIds.includes(m.module_id);
              return (
                <Pressable
                  key={m.module_id}
                  testID={`module-${m.module_id}`}
                  onPress={() => router.push(`/module/${m.module_id}`)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                      <Feather
                        name={ICON_MAP[m.icon] || 'book'}
                        size={22}
                        color={colors.onBrandTertiary}
                      />
                    </View>
                    {isDownloaded && (
                      <View
                        style={styles.downloadedDot}
                        testID={`downloaded-${m.module_id}`}
                      >
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
                  <Text style={styles.cardSummary} numberOfLines={3}>{m.summary}</Text>
                  <View style={styles.duration}>
                    <Feather name="clock" size={11} color={colors.onSurfaceTertiary} />
                    <Text style={styles.durationText}>{m.duration}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4 },
  dlAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minHeight: 36,
  },
  dlAllText: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  downloadedDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: 4 },
  cardSummary: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 18, flex: 1 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  durationText: { color: colors.onSurfaceTertiary, fontSize: font.sm },
});
