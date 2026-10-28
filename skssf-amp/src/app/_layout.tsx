import { ThemeProvider, DefaultTheme } from 'expo-router';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n';
import { colors } from '../components/ui';
import { SessionProvider, useSession } from '../lib/auth';
import { registerPush } from '../lib/push';

SplashScreen.preventAutoHideAsync();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg } };

function RootStack() {
  const { state } = useSession();
  const { t } = useTranslation();

  useEffect(() => {
    if (state !== 'loading') SplashScreen.hideAsync();
  }, [state]);

  useEffect(() => {
    if (state !== 'member') return;
    let off: (() => void) | undefined;
    registerPush()
      .then((f) => (off = f))
      .catch(() => undefined);
    return () => off?.();
  }, [state]);

  if (state === 'loading') return null;
  const member = state === 'member';

  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={member}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ title: t('feed.title') }} />
        <Stack.Screen name="request-patient" options={{ title: t('request.title') }} />
        <Stack.Screen name="my-requests" options={{ title: t('requests.title') }} />
        <Stack.Screen name="my-donor" options={{ title: t('myDonor.title') }} />
      </Stack.Protected>
      <Stack.Protected guard={!member && state !== 'paused'}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={state === 'paused'}>
        <Stack.Screen name="paused" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <SessionProvider>
        <RootStack />
      </SessionProvider>
    </ThemeProvider>
  );
}
