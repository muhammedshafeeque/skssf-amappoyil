import { signInWithPhoneNumber } from '@react-native-firebase/auth';
import type { ConfirmationResult } from '@react-native-firebase/auth';
import { getIdTokenResult, signOut } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, colors, styles } from '../components/ui';
import { LANGUAGES, setLanguage } from '../i18n';
import { useSession } from '../lib/auth';
import { callFn, errorMessage } from '../lib/data';
import { auth } from '../lib/firebase';

type Step = 'id' | 'phone' | 'otp';
const RESEND_SECONDS = 60;

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const [step, setStep] = useState<Step>('id');
  const [id, setId] = useState('');
  const [masked, setMasked] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const fail = (err: unknown) => {
    const key = errorMessage(err);
    setError(['invalidCode', 'tooMany', 'network'].includes(key) ? t(`common.${key}`) : key);
  };

  const lookup = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await callFn<{ maskedPhone: string }>('lookupMember', { id: id.trim() });
      setMasked(res.maskedPhone);
      setStep('phone');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      // The server only answers "match" — it never sends the full number to the app.
      const res = await callFn<{ phone: string }>('lookupMember', { id: id.trim(), phone });
      session.setLinking(true);
      setConfirm(await signInWithPhoneNumber(auth, res.phone));
      setCode('');
      setStep('otp');
      setWait(RESEND_SECONDS);
    } catch (err) {
      session.setLinking(false);
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!confirm) return;
    setError(null);
    setBusy(true);
    try {
      const cred = await confirm.confirm(code.trim());
      await callFn('completeMemberLogin');
      session.setLinking(false);
      if (cred?.user) await getIdTokenResult(cred.user, true); // picks up the member claim → app opens
    } catch (err) {
      fail(err);
      if (!/invalidCode/.test(errorMessage(err))) {
        session.setLinking(false);
        await signOut(auth).catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>SK</Text>
            </View>
            <Text style={styles.h1}>{t('app.name')}</Text>
            <Text style={styles.muted}>{t('app.unit')}</Text>
          </View>

          {step === 'id' && (
            <>
              <Text style={styles.h2}>{t('login.title')}</Text>
              <Text style={[styles.muted, { marginBottom: 16 }]}>{t('login.subtitle')}</Text>
              <Field label={t('login.idLabel')} value={id} onChangeText={setId} autoCapitalize="characters" autoCorrect={false} placeholder="SKAMP001" error={error} onSubmitEditing={lookup} returnKeyType="next" />
              <Button title={t('login.continue')} onPress={lookup} loading={busy} disabled={id.trim().length < 3} />
            </>
          )}

          {step === 'phone' && (
            <>
              <Text style={styles.h2}>{t('login.confirmTitle')}</Text>
              <Text style={[styles.muted, { marginBottom: 16 }]}>{t('login.confirmText', { masked })}</Text>
              <Field label={t('login.phoneLabel')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" error={error} autoFocus />
              <Button title={t('login.sendOtp')} onPress={sendOtp} loading={busy} disabled={phone.replace(/\D/g, '').length < 10} />
              <Button title={t('login.changeId')} variant="text" onPress={() => { setStep('id'); setError(null); setPhone(''); }} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.h2}>{t('login.otpTitle')}</Text>
              <Text style={[styles.muted, { marginBottom: 16 }]}>{t('login.otpText', { masked })}</Text>
              <Field label={t('login.otpLabel')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" error={error} autoFocus style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }} />
              <Button title={t('login.verify')} onPress={verify} loading={busy} disabled={code.length !== 6} />
              <Button title={wait > 0 ? t('login.resendIn', { s: wait }) : t('login.resend')} variant="text" disabled={wait > 0 || busy} onPress={sendOtp} />
              <Button title={t('login.changeId')} variant="text" onPress={() => { session.setLinking(false); setStep('id'); setError(null); setCode(''); }} />
            </>
          )}

          <Text style={[styles.muted, { textAlign: 'center', marginTop: 24, fontSize: 12 }]}>{t('login.help')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 16 }}>
            {LANGUAGES.map((l) => (
              <Text key={l.code} onPress={() => setLanguage(l.code)} style={{ color: i18n.language === l.code ? colors.primary : colors.muted, fontWeight: i18n.language === l.code ? '700' : '400' }}>
                {l.label}
              </Text>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
