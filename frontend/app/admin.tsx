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
import { useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { colors, font, radius, spacing } from '@/src/theme';
import { useToast } from '@/src/toast';

type AdminSummary = {
  counts: {
    users: number;
    groups: number;
    funding_requests: number;
    donor_reviews: number;
    opportunities: number;
    training_modules: number;
    donors: number;
  };
  catalog: {
    donor_countries: string[];
    donor_types: string[];
    opportunity_sectors: string[];
    training_minutes: number;
  };
  donor_ratings: {
    average: number;
    count: number;
    funded_count: number;
  };
  funding_by_sector: { sector: string; count: number }[];
  recent_groups: {
    group_id: string;
    name: string;
    location: string;
    members?: string[];
  }[];
  recent_funding: {
    request_id: string;
    project_name: string;
    sector: string;
    target_amount: string;
    status: string;
    ai_generated?: boolean;
  }[];
};

const numberFormat = new Intl.NumberFormat('fr-FR');

export default function AdminDashboard() {
  const [data, setData] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const summary = await apiFetch('/admin/summary');
      setData(summary);
    } catch {
      toast.show("Impossible de charger le tableau de bord administrateur.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = data?.counts;
  const stats = counts
    ? [
        { label: 'Utilisatrices', value: counts.users, icon: 'users' },
        { label: 'Groupes', value: counts.groups, icon: 'home' },
        { label: 'Demandes', value: counts.funding_requests, icon: 'file-text' },
        { label: 'Avis bailleurs', value: counts.donor_reviews, icon: 'star' },
        { label: 'Formations', value: counts.training_modules, icon: 'book-open' },
        { label: 'Bailleurs', value: counts.donors, icon: 'briefcase' },
      ] as const
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="admin-screen">
      <View style={styles.topbar}>
        <Pressable testID="admin-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.topbarTitle}>Administration</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Tableau de bord indisponible.</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 80 + insets.bottom }}
        >
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Vue opérationnelle</Text>
            <Text style={styles.heroTitle}>Éclosion</Text>
            <Text style={styles.heroSubtitle}>
              Suivi des contenus, des groupes et des demandes de financement.
            </Text>
          </View>

          <View style={styles.statsGrid}>
            {stats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Feather name={item.icon} size={18} color={colors.brandPrimary} />
                </View>
                <Text style={styles.statValue}>{numberFormat.format(item.value)}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catalogue</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Opportunités</Text>
              <Text style={styles.metricValue}>{data.counts.opportunities}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Pays couverts</Text>
              <Text style={styles.metricValue}>{data.catalog.donor_countries.length}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Temps de formation</Text>
              <Text style={styles.metricValue}>{data.catalog.training_minutes} min</Text>
            </View>
            <View style={styles.chips}>
              {data.catalog.opportunity_sectors.map((sector) => (
                <View key={sector} style={styles.chip}>
                  <Text style={styles.chipText}>{sector}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bailleurs</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Note moyenne</Text>
              <Text style={styles.metricValue}>{data.donor_ratings.average}/5</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avis avec financement</Text>
              <Text style={styles.metricValue}>{data.donor_ratings.funded_count}</Text>
            </View>
            <Text style={styles.mutedText} numberOfLines={3}>
              {data.catalog.donor_countries.join(' · ')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demandes par secteur</Text>
            {data.funding_by_sector.length === 0 ? (
              <Text style={styles.mutedText}>Aucune demande enregistrée.</Text>
            ) : (
              data.funding_by_sector.map((item) => (
                <View key={item.sector} style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{item.sector}</Text>
                  <Text style={styles.metricValue}>{item.count}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Groupes récents</Text>
            {data.recent_groups.length === 0 ? (
              <Text style={styles.mutedText}>Aucun groupe créé.</Text>
            ) : (
              data.recent_groups.map((group) => (
                <View key={group.group_id} style={styles.listItem}>
                  <View style={styles.listIcon}>
                    <Feather name="users" size={16} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.listSub} numberOfLines={1}>
                      {group.location} · {group.members?.length ?? 0} membre(s)
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dernières demandes</Text>
            {data.recent_funding.length === 0 ? (
              <Text style={styles.mutedText}>Aucune demande générée.</Text>
            ) : (
              data.recent_funding.map((request) => (
                <View key={request.request_id} style={styles.listItem}>
                  <View style={styles.listIcon}>
                    <Feather name={request.ai_generated ? 'zap' : 'file-text'} size={16} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{request.project_name}</Text>
                    <Text style={styles.listSub} numberOfLines={1}>
                      {request.sector} · {request.target_amount} · {request.status}
                    </Text>
                  </View>
                </View>
              ))
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
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  hero: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  heroLabel: { color: colors.brandSecondary, fontSize: font.sm, fontWeight: '500', marginBottom: spacing.sm },
  heroTitle: { color: colors.onSurfaceInverse, fontSize: font.xxxl, fontWeight: '500' },
  heroSubtitle: { color: colors.onSurfaceInverse, opacity: 0.78, fontSize: font.base, lineHeight: 20, marginTop: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md },
  statCard: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 132,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statValue: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  statLabel: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 4 },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: spacing.md },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  metricLabel: { color: colors.onSurfaceSecondary, fontSize: font.base, flex: 1 },
  metricValue: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { color: colors.onBrandTertiary, fontSize: font.sm, fontWeight: '500' },
  mutedText: { color: colors.onSurfaceTertiary, fontSize: font.base, lineHeight: 20 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  listSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
});
