import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/src/theme';
import { useAuth } from '@/src/auth-context';
import { View, ActivityIndicator } from 'react-native';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 76,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          tabBarButtonTestID: 'tab-accueil',
        }}
      />
      <Tabs.Screen
        name="formations"
        options={{
          title: 'Formations',
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
          tabBarButtonTestID: 'tab-formations',
        }}
      />
      <Tabs.Screen
        name="financement"
        options={{
          title: 'Financement',
          tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} />,
          tabBarButtonTestID: 'tab-financement',
        }}
      />
      <Tabs.Screen
        name="groupe"
        options={{
          title: 'Mon Groupe',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
          tabBarButtonTestID: 'tab-groupe',
        }}
      />
    </Tabs>
  );
}
