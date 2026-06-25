import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/src/api';
import { colors, spacing, radius, font } from '@/src/theme';

type Step = { key: string; label: string; placeholder: string; multiline?: boolean };

const STEPS: Step[] = [
  { key: 'project_name', label: "Comment s'appelle votre projet ?", placeholder: 'Ex: Coopérative de transformation du manioc' },
  { key: 'sector', label: "Dans quel secteur ?", placeholder: 'Agriculture, Artisanat, Élevage, ...' },
  { key: 'problem', label: "Quel problème résolvez-vous ?", placeholder: 'Ex: Le manioc se gâte avant d\'arriver au marché', multiline: true },
  { key: 'solution', label: "Quelle est votre solution ?", placeholder: 'Ex: Transformer le manioc en farine au village', multiline: true },
  { key: 'beneficiaries', label: "Qui en bénéficiera ?", placeholder: 'Ex: 15 femmes du village et leurs familles' },
  { key: 'target_amount', label: "Quel montant recherchez-vous ?", placeholder: 'Ex: 500 000 FCFA' },
];

type State = Record<string, string>;

export default function Financement() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<State>({});
  const [generating, setGenerating] = useState(false);
  const [pitch, setPitch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadHistory = async () => {
    try {
      const items = await apiFetch('/funding/mine');
      setHistory(items);
    } catch {}
  };

  useEffect(() => { loadHistory(); }, []);

  const current = STEPS[step];
  const total = STEPS.length;
  const value = data[current?.key] || '';

  const next = async () => {
    if (!value.trim()) return;
    Haptics.selectionAsync().catch(() => {});
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      await generate();
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch('/funding/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setPitch(res.pitch);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      loadHistory();
    } catch (e: any) {
      setError("La génération a échoué. Veuillez réessayer.");
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setStep(0);
    setData({});
    setPitch(null);
    setError(null);
  };

  if (generating) {
    return (
      <SafeAreaView style={styles.safe} testID="generating-screen">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={styles.genTitle}>L&apos;IA rédige votre plan d&apos;affaires...</Text>
          <Text style={styles.genSub}>Cela peut prendre 20-30 secondes.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (pitch) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']} testID="pitch-result">
        <View style={styles.topbar}>
          <Pressable onPress={reset} testID="new-pitch" style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.topbarTitle}>Votre plan d&apos;affaires</Text>
          <View style={styles.iconBtn} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 + insets.bottom }}>
          <View style={styles.pitchCard}>
            <Text style={styles.pitchText}>{pitch}</Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={reset} testID="another-request">
            <Feather name="plus" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>Nouveau projet</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.surfaceSecondary, marginTop: spacing.md }]}
            onPress={() => router.push('/donors')}
            testID="see-donors-after"
          >
            <Feather name="users" size={18} color={colors.brandPrimary} />
            <Text style={[styles.primaryBtnText, { color: colors.brandPrimary }]}>Envoyer à un bailleur</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="financement-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Financement</Text>
          <Text style={styles.subtitle}>
            Étape {step + 1} sur {total}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((step + 1) / total) * 100}%` }]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>{current.label}</Text>
          <TextInput
            testID={`step-input-${current.key}`}
            value={value}
            onChangeText={(t) => setData({ ...data, [current.key]: t })}
            placeholder={current.placeholder}
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline={current.multiline}
            style={[styles.input, current.multiline && { minHeight: 140, textAlignVertical: 'top' }]}
          />
          {error && <Text style={styles.error}>{error}</Text>}

          {step === 0 && (
            <Pressable
              testID="open-donors"
              onPress={() => router.push('/donors')}
              style={styles.donorBanner}
            >
              <View style={styles.donorIcon}>
                <Feather name="users" size={20} color={colors.onBrandSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.donorBannerTitle}>Annuaire des bailleurs</Text>
                <Text style={styles.donorBannerSub}>
                  ONG, microfinances et programmes pour 5 pays
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.onSurfaceTertiary} />
            </Pressable>
          )}

          {history.length > 0 && step === 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.historyTitle}>Vos projets précédents</Text>
              {history.slice(0, 3).map((h) => (
                <Pressable
                  key={h.request_id}
                  style={styles.historyItem}
                  onPress={() => setPitch(h.pitch)}
                  testID={`history-${h.request_id}`}
                >
                  <Feather name="file-text" size={16} color={colors.brandPrimary} />
                  <Text style={styles.historyName} numberOfLines={1}>{h.project_name}</Text>
                  <Feather name="chevron-right" size={16} color={colors.onSurfaceTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: 16 + insets.bottom }]}>
          {step > 0 && (
            <Pressable
              testID="back-step"
              onPress={() => setStep(step - 1)}
              style={styles.secondaryBtn}
            >
              <Feather name="arrow-left" size={18} color={colors.brandPrimary} />
            </Pressable>
          )}
          <Pressable
            testID="next-step"
            onPress={next}
            disabled={!value.trim()}
            style={[styles.primaryBtn, { flex: 1, opacity: value.trim() ? 1 : 0.5 }]}
          >
            <Text style={styles.primaryBtnText}>
              {step < total - 1 ? 'Suivant' : 'Générer mon pitch'}
            </Text>
            <Feather
              name={step < total - 1 ? 'arrow-right' : 'zap'}
              size={18}
              color={colors.onBrandPrimary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  genTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', textAlign: 'center' },
  genSub: { color: colors.onSurfaceTertiary, fontSize: font.base, textAlign: 'center' },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500' },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: font.base, marginTop: 4, marginBottom: spacing.md },
  progressBar: {
    height: 4, backgroundColor: colors.surfaceTertiary, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.brandPrimary },
  question: { color: colors.onSurface, fontSize: font.xl, fontWeight: '500', marginBottom: spacing.lg, lineHeight: 28 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: font.lg,
    color: colors.onSurface,
    minHeight: 56,
  },
  error: { color: colors.error, marginTop: spacing.sm, fontSize: font.base },
  stickyFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
  secondaryBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  pitchCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  pitchText: { color: colors.onSurface, fontSize: font.base, lineHeight: 22 },
  historyTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500', marginBottom: spacing.md },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  historyName: { flex: 1, color: colors.onSurface, fontSize: font.base },
  donorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  donorIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  donorBannerTitle: { color: colors.onSurface, fontSize: font.lg, fontWeight: '500' },
  donorBannerSub: { color: colors.onSurfaceTertiary, fontSize: font.sm, marginTop: 2 },
});
