import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from '../shared';

// Every function module imports this file first, so options apply before any function is defined.
setGlobalOptions({ region: REGION, maxInstances: 10 });

if (getApps().length === 0) initializeApp();

export const auth = getAuth();
export const db = getFirestore();
export const messaging = getMessaging();
db.settings({ ignoreUndefinedProperties: true });
