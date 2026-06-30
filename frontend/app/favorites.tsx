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
import { colors, font, radius, spacing } from '@/src/theme';
import {
  getFavoriteList,
  toggleFavorite,
  type FavoriteItem,
  type FavoriteKind,
} from '@/src/offline';

const LABELS: Record<FavoriteKind, string> = {
  module: 'Formation',
  donor: 'Bailleur',
  opportunity: 'Opportunité',
};

const ICONS: Record<FavoriteKind, keyof typeof Feather.glyphMap> = {
  module: 'book-open',
  donor: 'briefcase',
  opportunity: 'compass',
};

export default function Favorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setItems(await getFavoriteList());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const removeFavorite = async (item: FavoriteItem) => {
    await toggleFavorite(item);
    await load();
  };

  const openFavorite = (item: FavoriteItem) => {
    if (item.kind === 'module' && item.href) {
      router.push(item.href as never);
      return;
    }
    if (item.kind === 'donor') {
      router.push('/donors' as never);
      return;
    }
    router.push('/' as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="favorites-screen">
      <View style={styles.topbar}>
        <Pressable testID="favorites-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Favoris</Text>
          <Text style={styles.subtitle}>{items.length} élément(s) enregistré(s)</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="star" size={32} color={colors.onSurfaceTertiary} />
          <Text style={styles.empty}>Aucun favori pour le moment.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80 + insets.bottom }}>
          {items.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              testID={`favorite-item-${item.kind}-${item.id}`}
              onPress={() => openFavorite(item)}
              style={styles.card}
            >
              <View style={styles.itemIcon}>
                <Feather name={ICONS[item.kind]} size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kind}>{LABELS[item.kind]}</Text>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                {item.subtitle && <Text style={styles.itemSub} numberOfLines={1}>{item.subtitle}</Text>}
                {item.description && <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>}
              </View>
              <Pressable
                testID={`remove-favorite-${item.kind}-${item.id}`}
                onPress={() => removeFavorite(item)}
                style={styles.removeBtn}
              >
                <Feather name="star" size={18} color={colors.brandSecondary} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
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
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500', marginBottom: 2 },
  itemTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  itemSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 3 },
  itemDesc: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 18, marginTop: spacing.sm },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
