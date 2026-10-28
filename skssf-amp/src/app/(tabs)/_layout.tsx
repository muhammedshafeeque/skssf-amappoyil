import Ionicons from '@expo/vector-icons/Ionicons';
import Tabs from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { colors } from '../../components/ui';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('feed.title'), tabBarLabel: t('tabs.home'), tabBarIcon: icon('newspaper-outline') }} />
      <Tabs.Screen name="donors" options={{ title: t('donors.title'), tabBarLabel: t('tabs.donors'), tabBarIcon: icon('water-outline') }} />
      <Tabs.Screen name="sahajari" options={{ title: t('sahajari.title'), tabBarLabel: t('tabs.sahajari'), tabBarIcon: icon('heart-outline') }} />
      <Tabs.Screen name="committee" options={{ title: t('committee.title'), tabBarLabel: t('tabs.committee'), tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title'), tabBarLabel: t('tabs.profile'), tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  );
}
