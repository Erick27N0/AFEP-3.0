import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';
import { getFavorites, toggleFavorite, type FavoritesMap } from '@/src/offline';

type Donor = {
  donor_id: string;
  name: string;
  type: string;
  country: string;
  sectors: string[];
  description: string;
  phone: string;
  website: string;
  city: string;
  avg_rating: number;
  rating_count: number;
};

const TYPE_COLOR: Record<string, string> = {
  'ONG internationale': '#4A5D6B',
  'ONG locale': '#4A5D6B',
  'Microfinance': '#D98A2C',
  'Programme gouvernemental': '#4A6B4E',
  'Banque publique': '#3D734B',
};

export default function Donors() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [countries, setCountries] = useState<string[]>(['Tous']);
  const [country, setCountry] = useState('Tous');
  const [donors, setDonors] = useState<Donor[]>([]);
  const [favorites, setFavorites] = useState<FavoritesMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/donors/countries').then(setCountries).catch(() => {});
    getFavorites().then(setFavorites).catch(() => {});
  }, []);

  const load = useCallback(async (c: string) => {
    setLoading(true);
    try {
      const q = c === 'Tous' ? '' : `?country=${encodeURIComponent(c)}`;
      const d = await apiFetch(`/donors${q}`);
      setDonors(d);
    } catch {
      toast.show("Impossible de charger la liste des bailleurs.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(country); }, [country, load]);

  const handleFavoriteDonor = async (d: Donor) => {
    const active = await toggleFavorite({
      kind: 'donor',
      id: d.donor_id,
      title: d.name,
      subtitle: `${d.city}, ${d.country}`,
      description: d.description,
      href: '/donors',
    });
    setFavorites(await getFavorites());
    toast.show(active ? 'Bailleur ajouté aux favoris.' : 'Bailleur retiré des favoris.', 'success');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="donors-screen">
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bailleurs de fonds</Text>
          <Text style={styles.subtitle}>{donors.length} contact(s) disponible(s)</Text>
        </View>
      </View>

      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {countries.map((c) => {
            const active = c === country;
            return (
              <Pressable
                key={c}
                testID={`chip-${c}`}
                onPress={() => setCountry(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : donors.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucun bailleur pour ce pays pour le moment.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: 60 + insets.bottom,
          }}
        >
          {donors.map((d) => (
            <View key={d.donor_id} style={styles.card} testID={`donor-${d.donor_id}`}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: (TYPE_COLOR[d.type] || colors.brandPrimary) + '22' },
                  ]}
                >
                  <Text style={[styles.typeText, { color: TYPE_COLOR[d.type] || colors.brandPrimary }]}>
                    {d.type}
                  </Text>
                </View>
                <View style={styles.locRow}>
                  <Feather name="map-pin" size={11} color={colors.onSurfaceTertiary} />
                  <Text style={styles.locText}>{d.city}</Text>
                </View>
              </View>

              <View style={styles.donorTitleRow}>
                <Text style={styles.donorName}>{d.name}</Text>
                <Pressable
                  testID={`favorite-${d.donor_id}`}
                  onPress={() => handleFavoriteDonor(d)}
                  style={styles.favoriteBtn}
                >
                  <Feather
                    name="star"
                    size={17}
                    color={favorites?.donor[d.donor_id] ? colors.brandSecondary : colors.onSurfaceTertiary}
                  />
                </Pressable>
              </View>
              {d.rating_count > 0 && (
                <View style={styles.ratingRow} testID={`rating-${d.donor_id}`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Feather
                      key={s}
                      name="star"
                      size={12}
                      color={s <= Math.round(d.avg_rating) ? colors.brandSecondary : colors.surfaceTertiary}
                    />
                  ))}
                  <Text style={styles.ratingText}>
                    {d.avg_rating.toFixed(1)} · {d.rating_count} avis
                  </Text>
                </View>
              )}
              <Text style={styles.donorDesc}>{d.description}</Text>

              <View style={styles.sectorsRow}>
                {d.sectors.map((s) => (
                  <View key={s} style={styles.sectorChip}>
                    <Text style={styles.sectorText}>{s}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <Pressable
                  testID={`call-${d.donor_id}`}
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => Linking.openURL(`tel:${d.phone.replace(/\s/g, '')}`)}
                >
                  <Feather name="phone" size={15} color={colors.onBrandPrimary} />
                  <Text style={styles.actionPrimaryText}>Appeler</Text>
                </Pressable>
                <Pressable
                  testID={`web-${d.donor_id}`}
                  style={[styles.actionBtn, styles.actionSecondary]}
                  onPress={() => Linking.openURL(d.website)}
                >
                  <Feather name="external-link" size={15} color={colors.brandPrimary} />
                  <Text style={styles.actionSecondaryText}>Site web</Text>
                </Pressable>
                <Pressable
                  testID={`rate-${d.donor_id}`}
                  style={[styles.actionBtn, styles.actionSecondary]}
                  onPress={() => router.push(`/donor-rate/${d.donor_id}?name=${encodeURIComponent(d.name)}`)}
                >
                  <Feather name="star" size={15} color={colors.brandSecondary} />
                  <Text style={[styles.actionSecondaryText, { color: colors.brandSecondary }]}>Noter</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  chipsRow: { height: 56, justifyContent: 'center' },
  chipsContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: font.base, fontWeight: '500' },
  chipTextActive: { color: colors.onBrandPrimary },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  typeText: { fontSize: font.sm, fontWeight: '500' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { color: colors.onSurfaceTertiary, fontSize: font.sm },
  donorTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 4 },
  donorName: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', flex: 1 },
  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: spacing.sm,
  },
  ratingText: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginLeft: 4 },
  donorDesc: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 20, marginBottom: spacing.md },
  sectorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  sectorChip: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  sectorText: { color: colors.onBrandTertiary, fontSize: font.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
  },
  actionPrimary: { backgroundColor: colors.brandPrimary },
  actionPrimaryText: { color: colors.onBrandPrimary, fontSize: font.base, fontWeight: '500' },
  actionSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandPrimary },
  actionSecondaryText: { color: colors.brandPrimary, fontSize: font.base, fontWeight: '500' },
});
