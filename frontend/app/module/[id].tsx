import { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { colors, spacing, radius, font } from '@/src/theme';

type Section = { title: string; content: string };
type ModuleDetail = {
  module_id: string;
  title: string;
  summary: string;
  duration: string;
  sections: Section[];
};

export default function ModuleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/training/modules/${id}`)
      .then(setData)
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="module-detail">
      <View style={styles.topbar}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.topbarTitle}>Formation</Text>
        <View style={styles.iconBtn} />
      </View>
      {loading || !data ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
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
});
