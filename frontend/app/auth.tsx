import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/auth-context';
import { useToast } from '@/src/toast';
import { API, setToken } from '@/src/api';
import { colors, spacing, font } from '@/src/theme';

/**
 * Auth callback route. Hit when Emergent Google Auth redirects back to the app
 * with `?session_id=XXX`. Exchanges the token with our backend, persists the
 * session, then redirects to the tabs. Falls back to welcome on error.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ session_id?: string }>();
  const router = useRouter();
  const { refresh } = useAuth();
  const toast = useToast();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!params.session_id) return;
    const run = async () => {
      try {
        const r = await fetch(
          'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
          { headers: { 'X-Session-ID': String(params.session_id) } }
        );
        if (!r.ok) throw new Error('session-data failed');
        const data = await r.json();
        const ex = await fetch(`${API}/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: data.session_token }),
        });
        if (!ex.ok) throw new Error('backend exchange failed');
        const body = await ex.json();
        await setToken(body.session_token);
        await refresh();
        router.replace('/(tabs)');
      } catch {
        toast.show("La connexion Google a échoué. Réessayez.");
        setDone(true);
      }
    };
    run();
  }, [params.session_id, router, refresh, toast]);

  // Declarative redirect (safe before layout mount)
  if (!params.session_id || done) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.center} testID="auth-callback">
      <ActivityIndicator size="large" color={colors.brandPrimary} />
      <Text style={styles.text}>Connexion en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  text: { color: colors.onSurfaceSecondary, fontSize: font.lg },
});
