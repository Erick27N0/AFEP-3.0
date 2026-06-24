import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { colors, spacing, radius, font } from '@/src/theme';

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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    apiFetch('/training/modules')
      .then(setItems)
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="formations-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Formations</Text>
        <Text style={styles.subtitle}>Apprenez à votre rythme</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: 100 + insets.bottom,
          }}
        >
          <View style={styles.grid}>
            {items.map((m) => (
              <Pressable
                key={m.module_id}
                testID={`module-${m.module_id}`}
                onPress={() => router.push(`/module/${m.module_id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.iconBox}>
                  <Feather
                    name={ICON_MAP[m.icon] || 'book'}
                    size={22}
                    color={colors.onBrandTertiary}
                  />
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
                <Text style={styles.cardSummary} numberOfLines={3}>{m.summary}</Text>
                <View style={styles.duration}>
                  <Feather name="clock" size={11} color={colors.onSurfaceTertiary} />
                  <Text style={styles.durationText}>{m.duration}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 180,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: 4 },
  cardSummary: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 18, flex: 1 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  durationText: { color: colors.onSurfaceTertiary, fontSize: font.sm },
});
