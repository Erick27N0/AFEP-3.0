import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { useAuth } from '@/src/auth-context';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';
import { getFavorites, toggleFavorite, type FavoritesMap } from '@/src/offline';

type Opportunity = {
  opp_id: string;
  title: string;
  sector: string;
  location: string;
  description: string;
  image_url: string;
  featured?: boolean;
};

export default function Accueil() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [favorites, setFavorites] = useState<FavoritesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [data, savedFavorites] = await Promise.all([
        apiFetch('/opportunities'),
        getFavorites(),
      ]);
      setItems(data);
      setFavorites(savedFavorites);
    } catch {
      toast.show("Impossible de charger les opportunités. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFavoriteOpportunity = async (item: Opportunity) => {
    const active = await toggleFavorite({
      kind: 'opportunity',
      id: item.opp_id,
      title: item.title,
      subtitle: item.location,
      description: item.description,
      href: '/',
    });
    setFavorites(await getFavorites());
    toast.show(active ? 'Opportunité ajoutée aux favoris.' : 'Opportunité retirée des favoris.', 'success');
  };

  const featured = items.find((i) => i.featured) || items[0];
  const rest = items.filter((i) => i.opp_id !== featured?.opp_id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="accueil-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Bonjour</Text>
          <Text style={styles.name} numberOfLines={1}>{user?.name?.split(' ')[0] || 'Bienvenue'}</Text>
        </View>
        <Pressable
          testID="open-search"
          onPress={() => router.push('/search' as never)}
          style={styles.adminButton}
        >
          <Feather name="search" size={19} color={colors.onSurfaceSecondary} />
        </Pressable>
        <Pressable
          testID="open-dashboard"
          onPress={() => router.push('/dashboard' as never)}
          style={styles.adminButton}
        >
          <Feather name="activity" size={19} color={colors.info} />
        </Pressable>
        <Pressable
          testID="open-favorites"
          onPress={() => router.push('/favorites' as never)}
          style={styles.adminButton}
        >
          <Feather name="heart" size={19} color={colors.brandSecondary} />
        </Pressable>
        <Pressable
          testID="open-reminders"
          onPress={() => router.push('/reminders' as never)}
          style={styles.adminButton}
        >
          <Feather name="bell" size={19} color={colors.info} />
        </Pressable>
        <Pressable
          testID="open-admin"
          onPress={() => router.push('/admin' as never)}
          style={styles.adminButton}
        >
          <Feather name="bar-chart-2" size={19} color={colors.brandPrimary} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <Text style={styles.section}>À la une</Text>
          {featured && (
            <Pressable testID={`featured-${featured.opp_id}`} style={styles.heroCard}>
              <Image source={featured.image_url} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(43,51,44,0.85)']}
                style={StyleSheet.absoluteFill}
                locations={[0.4, 1]}
              />
              <View style={styles.heroContent}>
                <View style={styles.heroTopRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{featured.sector}</Text>
                  </View>
                  <Pressable
                    testID={`favorite-${featured.opp_id}`}
                    onPress={() => handleFavoriteOpportunity(featured)}
                    style={styles.heroFavoriteBtn}
                  >
                    <Feather
                      name="star"
                      size={17}
                      color={favorites?.opportunity[featured.opp_id] ? colors.brandSecondary : '#fff'}
                    />
                  </Pressable>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{featured.title}</Text>
                <View style={styles.heroMeta}>
                  <Feather name="map-pin" size={12} color="#fff" />
                  <Text style={styles.heroLoc} numberOfLines={1}>{featured.location}</Text>
                </View>
              </View>
            </Pressable>
          )}

          <Text style={styles.section}>Autres opportunités</Text>
          {rest.map((it) => (
            <Pressable key={it.opp_id} testID={`opp-${it.opp_id}`} style={styles.card}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardSector}>{it.sector}</Text>
                  <Pressable
                    testID={`favorite-${it.opp_id}`}
                    onPress={() => handleFavoriteOpportunity(it)}
                    style={styles.favoriteBtn}
                  >
                    <Feather
                      name="star"
                      size={16}
                      color={favorites?.opportunity[it.opp_id] ? colors.brandSecondary : colors.onSurfaceTertiary}
                    />
                  </Pressable>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{it.description}</Text>
                <View style={styles.cardMeta}>
                  <Feather name="map-pin" size={11} color={colors.onSurfaceTertiary} />
                  <Text style={styles.cardLoc} numberOfLines={1}>{it.location}</Text>
                </View>
              </View>
              <Image source={it.image_url} style={styles.thumb} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        testID="fab-create-group"
        onPress={() => router.push('/groupe')}
        style={[styles.fab, { bottom: 96 + insets.bottom }]}
      >
        <Feather name="plus" size={22} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Créer un groupe</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  hello: { color: colors.onSurfaceTertiary, fontSize: font.base },
  name: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  adminButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.onBrandTertiary, fontSize: font.lg, fontWeight: '500' },
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    color: colors.onSurface,
    fontSize: font.lg,
    fontWeight: '500',
  },
  heroCard: {
    marginHorizontal: spacing.xl,
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
  },
  heroContent: { marginTop: 'auto', padding: spacing.lg, gap: spacing.sm },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  tagText: { color: '#fff', fontSize: font.sm, fontWeight: '500' },
  heroFavoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: font.xl, fontWeight: '500', lineHeight: 26 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLoc: { color: '#fff', opacity: 0.9, fontSize: font.sm },
  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  cardSector: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500', marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  favoriteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: 4 },
  cardDesc: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  cardLoc: { color: colors.onSurfaceTertiary, fontSize: font.sm, flex: 1 },
  thumb: { width: 88, height: 88, borderRadius: radius.md },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '500' },
});
