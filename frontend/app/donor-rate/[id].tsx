import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/src/api';
import { colors, spacing, radius, font } from '@/src/theme';

type Review = {
  user_name: string;
  stars: number;
  outcome: string;
  comment: string;
  created_at: string;
};

const OUTCOMES: { key: string; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'no_response', label: 'Pas de réponse', icon: 'clock' },
  { key: 'responded', label: 'A répondu', icon: 'message-circle' },
  { key: 'funded', label: 'Projet financé', icon: 'check-circle' },
  { key: 'rejected', label: 'Refusé', icon: 'x-circle' },
];

const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  OUTCOMES.map((o) => [o.key, o.label])
);

export default function RateDonor() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [stars, setStars] = useState(0);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<{ reviews: Review[]; avg: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    try {
      const r = await apiFetch(`/donors/${id}/reviews`);
      setData(r);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const submit = async () => {
    if (!stars || !outcome) return;
    setSubmitting(true);
    try {
      await apiFetch(`/donors/${id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ stars, outcome, comment }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSubmitted(true);
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="rate-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
            <Feather name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.topbarTitle} numberOfLines={1}>Noter ce bailleur</Text>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.donorName}>{name || 'Bailleur'}</Text>
          {data && data.count > 0 && (
            <View style={styles.avgRow}>
              <Feather name="star" size={16} color={colors.brandSecondary} />
              <Text style={styles.avgText}>{data.avg.toFixed(1)}</Text>
              <Text style={styles.avgCount}>· {data.count} avis</Text>
            </View>
          )}

          {!submitted && (
            <>
              <Text style={styles.label}>1. Quel a été le résultat ?</Text>
              <View style={styles.outcomeGrid}>
                {OUTCOMES.map((o) => {
                  const active = outcome === o.key;
                  return (
                    <Pressable
                      key={o.key}
                      testID={`outcome-${o.key}`}
                      onPress={() => setOutcome(o.key)}
                      style={[styles.outcomeCard, active && styles.outcomeActive]}
                    >
                      <Feather
                        name={o.icon}
                        size={20}
                        color={active ? colors.onBrandPrimary : colors.brandPrimary}
                      />
                      <Text style={[styles.outcomeText, active && { color: colors.onBrandPrimary }]}>
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>2. Votre note</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    testID={`star-${s}`}
                    onPress={() => {
                      setStars(s);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    hitSlop={8}
                  >
                    <Feather
                      name="star"
                      size={36}
                      color={s <= stars ? colors.brandSecondary : colors.surfaceTertiary}
                      style={{
                        // @ts-ignore
                        textShadowColor: s <= stars ? colors.brandSecondary : 'transparent',
                      }}
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>3. Votre commentaire (optionnel)</Text>
              <TextInput
                testID="comment-input"
                value={comment}
                onChangeText={setComment}
                placeholder="Comment s'est passé le contact ? Délais, accueil, demandes..."
                placeholderTextColor={colors.onSurfaceTertiary}
                multiline
                maxLength={500}
                style={styles.input}
              />

              <Pressable
                testID="submit-rating"
                onPress={submit}
                disabled={!stars || !outcome || submitting}
                style={[styles.submitBtn, (!stars || !outcome || submitting) && { opacity: 0.5 }]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <>
                    <Feather name="send" size={18} color={colors.onBrandPrimary} />
                    <Text style={styles.submitText}>Publier mon avis</Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          {submitted && (
            <View style={styles.successCard} testID="success-state">
              <Feather name="check-circle" size={32} color={colors.success} />
              <Text style={styles.successTitle}>Merci pour votre retour !</Text>
              <Text style={styles.successSub}>
                Votre expérience aide les autres groupes à mieux choisir leurs bailleurs.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Avis de la communauté</Text>
          {loading ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.lg }} />
          ) : !data || data.reviews.length === 0 ? (
            <Text style={styles.empty}>Aucun avis pour le moment. Soyez la première !</Text>
          ) : (
            data.reviews.map((r, i) => (
              <View key={i} style={styles.reviewCard} testID={`review-${i}`}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewInitial}>
                      {(r.user_name || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.user_name?.split(' ')[0] || 'Anonyme'}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Feather
                          key={s}
                          name="star"
                          size={12}
                          color={s <= r.stars ? colors.brandSecondary : colors.surfaceTertiary}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.outcomeBadge}>
                  <Text style={styles.outcomeBadgeText}>
                    {OUTCOME_LABEL[r.outcome] || r.outcome}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { flex: 1, color: colors.onSurface, fontSize: font.lg, fontWeight: '500', textAlign: 'center' },
  donorName: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500', marginBottom: spacing.xs },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xl },
  avgText: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  avgCount: { color: colors.onSurfaceTertiary, fontSize: font.base },
  label: {
    color: colors.onSurface, fontSize: font.lg, fontWeight: '500',
    marginTop: spacing.lg, marginBottom: spacing.md,
  },
  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  outcomeCard: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  outcomeActive: { backgroundColor: colors.brandPrimary },
  outcomeText: { color: colors.onSurface, fontSize: font.base, fontWeight: '500', flex: 1 },
  starsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: font.base,
    color: colors.onSurface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  submitText: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
  successCard: {
    alignItems: 'center',
    backgroundColor: colors.brandTertiary,
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  successTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  successSub: { color: colors.onSurfaceSecondary, fontSize: font.base, textAlign: 'center', lineHeight: 20 },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    color: colors.onSurface,
    fontSize: font.lg,
    fontWeight: '500',
  },
  empty: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center', padding: spacing.lg },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewInitial: { color: colors.onBrandTertiary, fontSize: font.base, fontWeight: '500' },
  reviewName: { color: colors.onSurface, fontSize: font.base, fontWeight: '500' },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 2 },
  outcomeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  outcomeBadgeText: { color: colors.brandPrimary, fontSize: font.sm, fontWeight: '500' },
  reviewComment: { color: colors.onSurfaceSecondary, fontSize: font.base, lineHeight: 20 },
});
