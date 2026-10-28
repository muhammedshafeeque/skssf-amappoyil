import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { myDonorDetailsSchema } from '../shared';
import type { BloodDonor } from '../shared';
import { Button, Empty, Field, colors, styles } from '../components/ui';
import { useSession } from '../lib/auth';
import { callFn, errorMessage, useDocument } from '../lib/data';

export default function MyDonorScreen() {
  const { t } = useTranslation();
  const { memberId } = useSession();
  const { data: donor, loading } = useDocument<BloodDonor>(`bloodDonors/${memberId}`);
  const [form, setForm] = useState({ lastDonated: '', place: '', state: '', country: '', available: true, hideNumber: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (donor) {
      setForm({ lastDonated: donor.lastDonated ?? '', place: donor.location.place, state: donor.location.state, country: donor.location.country, available: donor.available, hideNumber: donor.hideNumber });
    }
  }, [donor]);

  if (!donor) return <Empty text={t('common.none')} loading={loading} />;
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = myDonorDetailsSchema.safeParse({
      lastDonated: form.lastDonated || null,
      location: { place: form.place, state: form.state, country: form.country },
      available: form.available,
      hideNumber: form.hideNumber,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path.at(-1)), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await callFn('updateMyDonorDetails', parsed.data);
      Alert.alert(t('myDonor.saved'));
    } catch (err) {
      Alert.alert(t('common.error'), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label={t('myDonor.lastDonated')} value={form.lastDonated} onChangeText={set('lastDonated')} placeholder="2026-08-15" error={errors.lastDonated} />
      <Field label={t('myDonor.place')} value={form.place} onChangeText={set('place')} error={errors.place} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label={t('myDonor.state')} value={form.state} onChangeText={set('state')} error={errors.state} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('myDonor.country')} value={form.country} onChangeText={set('country')} error={errors.country} />
        </View>
      </View>
      {(['available', 'hideNumber'] as const).map((k) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ color: colors.text, flex: 1 }}>{t(`myDonor.${k}`)}</Text>
          <Switch value={form[k]} onValueChange={set(k)} trackColor={{ true: colors.primary }} />
        </View>
      ))}
      <Button title={t('common.save')} onPress={save} loading={busy} />
    </ScrollView>
  );
}
