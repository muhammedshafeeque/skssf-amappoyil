// Run with: firebase emulators:exec --project demo-skamp "node scripts/smoke-emulators.mjs"
import { callable, phoneSignIn, show } from './emu.mjs';

show('POST ping (callable)', await callable('ping'));

const { sent, code, signedIn } = await phoneSignIn('+919999900001');
show('POST accounts:sendVerificationCode', { status: sent.status, sessionInfo: sent.body.sessionInfo?.slice(0, 12) + '…' });
show('GET emulator verificationCodes (OTP received)', { code });
show('POST accounts:signInWithPhoneNumber', {
  status: signedIn.status,
  phoneNumber: signedIn.body.phoneNumber,
  localId: signedIn.body.localId,
  isNewUser: signedIn.body.isNewUser,
  idToken: signedIn.body.idToken ? '<jwt>' : undefined,
});
