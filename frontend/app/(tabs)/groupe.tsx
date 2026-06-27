import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { apiFetch } from '@/src/api';
import { useAuth } from '@/src/auth-context';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';

type Group = {
  group_id: string;
  name: string;
  description: string;
  location: string;
  members: string[];
  created_by: string;
};

type Member = { user_id: string; name: string; picture?: string; email: string };

export default function MonGroupe() {
  const { user, refresh, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [form, setForm] = useState({ name: '', description: '', location: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const mine = await apiFetch('/groups/mine');
      setGroup(mine.group);
      setMembers(mine.members_info || []);
      if (!mine.group) {
        const all = await apiFetch('/groups');
        setAllGroups(all);
      }
    } catch (e) {
      toast.show("Impossible de charger votre groupe.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.location.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/groups', { method: 'POST', body: JSON.stringify(form) });
      await refresh();
      await load();
      setMode('idle');
      setForm({ name: '', description: '', location: '' });
      toast.show('Groupe créé avec succès', 'success');
    } catch (e) {
      toast.show("La création du groupe a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (groupId: string) => {
    setBusy(true);
    try {
      await apiFetch(`/groups/${groupId}/join`, { method: 'POST' });
      await refresh();
      await load();
      setMode('idle');
      toast.show('Vous avez rejoint le groupe', 'success');
    } catch (e) {
      toast.show("Impossible de rejoindre ce groupe. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      </SafeAreaView>
    );
  }

  // Has a group → dashboard
  if (group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']} testID="groupe-dashboard">
        <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
          <View style={styles.banner}>
            <View style={styles.bannerAvatar}>
              <Text style={styles.bannerAvatarText}>{group.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.bannerName}>{group.name}</Text>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={colors.onSurfaceSecondary} />
              <Text style={styles.bannerLoc}>{group.location}</Text>
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>À propos</Text>
            <Text style={styles.blockBody}>{group.description || 'Aucune description.'}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Membres ({members.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {members.map((m) => (
                <View key={m.user_id} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>{(m.name || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>{m.name?.split(' ')[0]}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Compte</Text>
            <View style={styles.row}>
              <Feather name="user" size={16} color={colors.onSurfaceSecondary} />
              <Text style={styles.rowText}>{user?.email}</Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={logout} testID="logout-button">
              <Feather name="log-out" size={16} color={colors.error} />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // No group → create/join
  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="groupe-empty">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 100 + insets.bottom }}>
          <Text style={styles.title}>Mon Groupe</Text>
          <Text style={styles.subtitle}>
            Rejoignez un groupe existant ou créez le vôtre pour collaborer.
          </Text>

          {mode === 'idle' && (
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Pressable
                style={styles.primaryCard}
                onPress={() => setMode('create')}
                testID="open-create"
              >
                <Feather name="plus-circle" size={28} color={colors.onBrandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.primaryCardTitle}>Créer un groupe</Text>
                  <Text style={styles.primaryCardSub}>Démarrez votre coopérative</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.secondaryCard}
                onPress={() => setMode('join')}
                testID="open-join"
              >
                <Feather name="users" size={24} color={colors.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secondaryCardTitle}>Rejoindre un groupe</Text>
                  <Text style={styles.secondaryCardSub}>{allGroups.length} groupe(s) disponible(s)</Text>
                </View>
              </Pressable>
              <Pressable style={styles.logoutBtn} onPress={logout} testID="logout-button">
                <Feather name="log-out" size={16} color={colors.error} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
              </Pressable>
            </View>
          )}

          {mode === 'create' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <Text style={styles.label}>Nom du groupe</Text>
              <TextInput
                testID="group-name"
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                placeholder="Ex: Coopérative Femmes du Centre"
                placeholderTextColor={colors.onSurfaceTertiary}
              />
              <Text style={styles.label}>Localisation</Text>
              <TextInput
                testID="group-location"
                style={styles.input}
                value={form.location}
                onChangeText={(t) => setForm({ ...form, location: t })}
                placeholder="Ex: Yaoundé, Cameroun"
                placeholderTextColor={colors.onSurfaceTertiary}
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                testID="group-description"
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                placeholder="Ex: Nous transformons le manioc en farine..."
                placeholderTextColor={colors.onSurfaceTertiary}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <Pressable style={styles.secondaryBtn} onPress={() => setMode('idle')} testID="cancel-create">
                  <Text style={styles.secondaryBtnText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, { flex: 1, opacity: busy ? 0.6 : 1 }]}
                  onPress={handleCreate}
                  disabled={busy}
                  testID="submit-create"
                >
                  <Text style={styles.primaryBtnText}>{busy ? 'Création...' : 'Créer le groupe'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {mode === 'join' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <Pressable style={styles.secondaryBtn} onPress={() => setMode('idle')}>
                <Text style={styles.secondaryBtnText}>← Retour</Text>
              </Pressable>
              {allGroups.length === 0 && (
                <Text style={styles.empty}>Aucun groupe disponible pour le moment. Créez le premier!</Text>
              )}
              {allGroups.map((g) => (
                <Pressable
                  key={g.group_id}
                  testID={`join-${g.group_id}`}
                  style={styles.groupItem}
                  onPress={() => handleJoin(g.group_id)}
                  disabled={busy}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>{g.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMeta}>{g.location} · {g.members.length} membre(s)</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4 },
  banner: {
    backgroundColor: colors.brandTertiary,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerAvatarText: { color: colors.onBrandPrimary, fontSize: font.xxl, fontWeight: '500' },
  bannerName: { color: colors.onBrandTertiary, fontSize: font.xxl, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerLoc: { color: colors.onSurfaceSecondary, fontSize: font.base },
  block: { padding: spacing.xl, gap: spacing.sm },
  blockTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: spacing.sm },
  blockBody: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 22 },
  memberItem: { alignItems: 'center', width: 64 },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  memberInitial: { color: colors.onBrandTertiary, fontSize: font.lg, fontWeight: '500' },
  memberName: { color: colors.onSurface, fontSize: font.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  rowText: { color: colors.onSurfaceSecondary, fontSize: font.base },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontSize: font.base, fontWeight: '500' },
  primaryCard: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 80,
  },
  primaryCardTitle: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
  primaryCardSub: { color: colors.onBrandPrimary, opacity: 0.85, fontSize: font.base },
  secondaryCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 80,
  },
  secondaryCardTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  secondaryCardSub: { color: colors.onSurfaceTertiary, fontSize: font.base },
  label: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: font.lg,
    color: colors.onSurface,
    minHeight: 52,
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 56,
  },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
  secondaryBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  groupItem: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupName: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  groupMeta: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center', padding: spacing.xl },
});
