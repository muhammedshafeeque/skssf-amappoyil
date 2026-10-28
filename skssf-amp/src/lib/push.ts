import { getMessaging, getToken, getInitialNotification, onNotificationOpenedApp, onTokenRefresh, requestPermission, deleteToken, AuthorizationStatus } from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { PermissionsAndroid, Platform } from 'react-native';
import { callFn } from './data';

const messaging = getMessaging();
let currentToken: string | null = null;

function openFromNotification(msg: RemoteMessage | null) {
  const data = msg?.data as { screen?: string; id?: string } | undefined;
  if (!data?.screen) return;
  if (data.screen === 'post' && data.id) router.push({ pathname: '/post/[id]', params: { id: data.id } });
  if (data.screen === 'request') router.push('/my-requests');
}

/** Asks for permission, registers the FCM token with the backend and wires notification taps. */
export async function registerPush(): Promise<() => void> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (res !== PermissionsAndroid.RESULTS.GRANTED) return () => undefined;
  } else {
    const status = await requestPermission(messaging);
    if (status !== AuthorizationStatus.AUTHORIZED && status !== AuthorizationStatus.PROVISIONAL) return () => undefined;
  }
  currentToken = await getToken(messaging);
  await callFn('registerPushToken', { token: currentToken, platform: Platform.OS });
  const offRefresh = onTokenRefresh(messaging, async (t) => {
    currentToken = t;
    await callFn('registerPushToken', { token: t, platform: Platform.OS });
  });
  const offOpen = onNotificationOpenedApp(messaging, openFromNotification);
  openFromNotification(await getInitialNotification(messaging));
  return () => {
    offRefresh();
    offOpen();
  };
}

/** On logout: stop pushes to this device for this account. */
export async function unregisterPush() {
  if (!currentToken) return;
  await callFn('registerPushToken', { token: currentToken, platform: Platform.OS, remove: true });
  await deleteToken(messaging);
  currentToken = null;
}
