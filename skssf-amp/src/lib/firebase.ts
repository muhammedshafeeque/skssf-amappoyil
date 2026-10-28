import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from '@react-native-firebase/functions';
import { getApp } from '@react-native-firebase/app';
import { REGION } from '../shared';

// Native config comes from google-services.json / GoogleService-Info.plist.
export const auth = getAuth();
export const db = getFirestore();
export const functions = getFunctions(getApp(), REGION);

if (process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? '10.0.2.2';
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
}
