import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { REGION } from '@skamp/shared';

initializeApp();
setGlobalOptions({ region: REGION, maxInstances: 10 });

/** Health check used by CI and to verify the deployment region. */
export const ping = onCall(() => ({ ok: true, region: REGION, at: new Date().toISOString() }));
