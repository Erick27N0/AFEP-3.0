import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/auth-context';
import { useToast } from '@/src/toast';
import { colors, spacing, radius, font } from '@/src/theme';

const HERO = 'https://images.unsplash.com/photo-1741940365831-1a1fdc2e33ff?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwcnVyYWwlMjB3b21lbiUyMGZhcm1pbmclMjBidXNpbmVzc3xlbnwwfHx8fDE3ODIzMDk3NTF8MA&ixlib=rb-4.1.0&q=85';

export default function Index() {
  const { user, loading, login, loginDemo, demoMode } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<null | 'google' | 'demo'>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  const handleGoogle = async () => {
    setBusy('google');
    try {
      await login();
    } catch (e: any) {
      toast.show("La connexion Google a échoué. Vérifiez votre internet et réessayez.");
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = async () => {
    setBusy('demo');
    try {
      await loginDemo();
    } catch (e: any) {
      toast.show("Connexion démo impossible. Le backend doit être lancé avec DEMO_MODE=true.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]} testID="auth-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="welcome-screen">
      <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(43,51,44,0.4)', 'rgba(43,51,44,0.92)']}
        style={StyleSheet.absoluteFill}
        locations={[0.3, 0.6, 1]}
      />
      <View style={styles.bottom}>
        <Text style={styles.brand}>Éclosion</Text>
        <Text style={styles.title}>Ensemble, bâtissons l&apos;avenir</Text>
        <Text style={styles.subtitle}>
          Une plateforme pour les groupes de femmes rurales d&apos;Afrique Centrale.
          Connectez-vous, formez-vous, financez vos projets.
        </Text>
        <Pressable
          testID="google-login-button"
          onPress={handleGoogle}
          disabled={!!busy}
          style={({ pressed }) => [styles.button, (pressed || busy === 'google') && { opacity: 0.7 }]}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Feather name="log-in" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.buttonText}>Continuer avec Google</Text>
            </>
          )}
        </Pressable>
        {demoMode && (
          <Pressable
            testID="demo-login-button"
            onPress={handleDemo}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.button,
              styles.demoButton,
              (pressed || busy === 'demo') && { opacity: 0.7 },
            ]}
          >
            {busy === 'demo' ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Feather name="zap" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.buttonText}>Connexion démo (sans Google)</Text>
              </>
            )}
          </Pressable>
        )}
        <Text style={styles.legal}>
          En continuant, vous acceptez d&apos;utiliser la plateforme à des fins communautaires.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceInverse },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    marginTop: 'auto',
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
    gap: spacing.md,
  },
  brand: {
    color: colors.brandSecondary,
    fontSize: font.lg,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onSurfaceInverse,
    fontSize: font.xxxl,
    fontWeight: '500',
    lineHeight: 38,
  },
  subtitle: {
    color: colors.onSurfaceInverse,
    opacity: 0.85,
    fontSize: font.lg,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  demoButton: {
    backgroundColor: 'rgba(217, 138, 44, 0.95)',
  },
  buttonText: {
    color: colors.onBrandPrimary,
    fontSize: font.lg,
    fontWeight: '500',
  },
  legal: {
    textAlign: 'center',
    color: colors.onSurfaceInverse,
    opacity: 0.6,
    fontSize: font.sm,
    marginTop: spacing.xs,
  },
});
