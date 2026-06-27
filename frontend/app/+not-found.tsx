import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, font } from '@/src/theme';

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={styles.container} testID="not-found-screen">
      <Feather name="compass" size={48} color={colors.brandPrimary} />
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.subtitle}>
        Cette page n&apos;existe pas ou n&apos;est plus disponible.
      </Text>
      <Pressable
        testID="go-home"
        onPress={() => router.replace('/')}
        style={styles.button}
      >
        <Feather name="home" size={18} color={colors.onBrandPrimary} />
        <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  title: { color: colors.onSurface, fontSize: font.xxl, fontWeight: '500', marginTop: spacing.md },
  subtitle: {
    color: colors.onSurfaceSecondary,
    fontSize: font.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  buttonText: { color: colors.onBrandPrimary, fontSize: font.lg, fontWeight: '500' },
});
