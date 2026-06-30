import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/src/api';
import { colors, font, radius, spacing } from '@/src/theme';
import { useToast } from '@/src/toast';

type SearchKind = 'all' | 'opportunity' | 'module' | 'donor' | 'group';

type SearchResult = {
  id: string;
  kind: Exclude<SearchKind, 'all'>;
  title: string;
  subtitle: string;
  description: string;
  filter: string;
  href: string;
};

type Opportunity = {
  opp_id: string;
  title: string;
  sector: string;
  location: string;
  description: string;
};

type Module = {
  module_id: string;
  title: string;
  summary: string;
  duration: string;
};

type Donor = {
  donor_id: string;
  name: string;
  type: string;
  country: string;
  city: string;
  sectors: string[];
  description: string;
};

type Group = {
  group_id: string;
  name: string;
  location: string;
  description: string;
  members: string[];
};

const KIND_LABELS: Record<SearchKind, string> = {
  all: 'Tout',
  opportunity: 'Opportunités',
  module: 'Formations',
  donor: 'Bailleurs',
  group: 'Groupes',
};

const KIND_ICONS: Record<Exclude<SearchKind, 'all'>, keyof typeof Feather.glyphMap> = {
  opportunity: 'compass',
  module: 'book-open',
  donor: 'briefcase',
  group: 'users',
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<SearchKind>('all');
  const [filter, setFilter] = useState('Tous');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opportunities, modules, donors, groups] = await Promise.all([
        apiFetch('/opportunities'),
        apiFetch('/training/modules'),
        apiFetch('/donors'),
        apiFetch('/groups'),
      ]);

      const mapped: SearchResult[] = [
        ...(opportunities as Opportunity[]).map((item) => ({
          id: item.opp_id,
          kind: 'opportunity' as const,
          title: item.title,
          subtitle: `${item.sector} · ${item.location}`,
          description: item.description,
          filter: item.sector,
          href: '/',
        })),
        ...(modules as Module[]).map((item) => ({
          id: item.module_id,
          kind: 'module' as const,
          title: item.title,
          subtitle: `Formation · ${item.duration}`,
          description: item.summary,
          filter: 'Formation',
          href: `/module/${item.module_id}`,
        })),
        ...(donors as Donor[]).map((item) => ({
          id: item.donor_id,
          kind: 'donor' as const,
          title: item.name,
          subtitle: `${item.type} · ${item.city}, ${item.country}`,
          description: item.description,
          filter: item.country,
          href: '/donors',
        })),
        ...(groups as Group[]).map((item) => ({
          id: item.group_id,
          kind: 'group' as const,
          title: item.name,
          subtitle: `${item.location} · ${item.members.length} membre(s)`,
          description: item.description,
          filter: item.location,
          href: '/groupe',
        })),
      ];
      setResults(mapped);
    } catch {
      toast.show("Impossible de charger la recherche.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const availableFilters = useMemo(() => {
    const scoped = kind === 'all' ? results : results.filter((item) => item.kind === kind);
    return ['Tous', ...Array.from(new Set(scoped.map((item) => item.filter))).sort()];
  }, [kind, results]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return results.filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (filter !== 'Tous' && item.filter !== filter) return false;
      if (!q) return true;
      const haystack = normalize(`${item.title} ${item.subtitle} ${item.description}`);
      return haystack.includes(q);
    });
  }, [filter, kind, query, results]);

  const setKindFilter = (next: SearchKind) => {
    setKind(next);
    setFilter('Tous');
  };

  const openResult = (item: SearchResult) => {
    router.push(item.href as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="search-screen">
      <View style={styles.topbar}>
        <Pressable testID="search-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Recherche</Text>
          <Text style={styles.subtitle}>{filtered.length} résultat(s)</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.onSurfaceTertiary} />
        <TextInput
          testID="search-input"
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une formation, un bailleur..."
          placeholderTextColor={colors.onSurfaceTertiary}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable testID="clear-search" onPress={() => setQuery('')} style={styles.clearBtn}>
            <Feather name="x" size={16} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.chipsBand}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(Object.keys(KIND_LABELS) as SearchKind[]).map((item) => {
            const active = item === kind;
            return (
              <Pressable
                key={item}
                testID={`kind-${item}`}
                onPress={() => setKindFilter(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {KIND_LABELS[item]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.chipsBand}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {availableFilters.map((item) => {
            const active = item === filter;
            return (
              <Pressable
                key={item}
                testID={`filter-${item}`}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={34} color={colors.onSurfaceTertiary} />
          <Text style={styles.empty}>Aucun résultat.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80 + insets.bottom }}>
          {filtered.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              testID={`search-result-${item.kind}-${item.id}`}
              onPress={() => openResult(item)}
              style={styles.card}
            >
              <View style={styles.resultIcon}>
                <Feather name={KIND_ICONS[item.kind]} size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultKind}>{KIND_LABELS[item.kind]}</Text>
                <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>
                <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: font.base, minHeight: 52 },
  clearBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  chipsBand: { minHeight: 48 },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: 'center', paddingVertical: spacing.xs },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: font.base, fontWeight: '500' },
  chipTextActive: { color: colors.onBrandPrimary },
  filterChip: {
    height: 34,
    maxWidth: 180,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { borderColor: colors.brandSecondary, backgroundColor: '#FFF6EA' },
  filterText: { color: colors.onSurfaceSecondary, fontSize: font.sm, fontWeight: '500' },
  filterTextActive: { color: colors.brandSecondary },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultKind: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500', marginBottom: 2 },
  resultTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  resultSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 3 },
  resultDesc: { color: colors.onSurfaceSecondary, fontSize: font.sm, lineHeight: 18, marginTop: spacing.sm },
});
