import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { GENDERS, PATIENT_CATEGORIES, SUPPORT_TYPES, normalizePhone, patientAddPayload } from '../shared';
import { Button, Chip, Field, styles } from '../components/ui';
import { callFn, errorMessage } from '../lib/data';

export default function RequestPatientScreen() {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: '', age: '', gender: '', phone: '', address: '', condition: '', need: '', category: '', supportTypes: [] as string[], relation: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const toggleSupport = (s: string) => setF((x) => ({ ...x, supportTypes: x.supportTypes.includes(s) ? x.supportTypes.filter((y) => y !== s) : [...x.supportTypes, s] }));

  const submit = async () => {
    const parsed = patientAddPayload.safeParse({ ...f, age: f.age === '' ? undefined : Number(f.age), phone: f.phone ? normalizePhone(f.phone) : '' });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message === 'Required' || /expected/i.test(i.message) ? t('common.required') : i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await callFn('submitRequest', { type: 'patient_add', payload: parsed.data });
      Alert.alert(t('request.sent'));
      router.replace('/my-requests');
    } catch (err) {
      Alert.alert(t('common.error'), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const choices = (key: 'gender' | 'category', options: readonly string[]) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{t(`request.${key}`)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map((o) => (
          <Chip key={o} label={t(`values.${o}`)} selected={f[key] === o} onPress={() => set(key)(o)} />
        ))}
      </View>
      {errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.muted, { marginBottom: 16 }]}>{t('request.intro')}</Text>
      <Field label={t('request.name')} value={f.name} onChangeText={set('name')} error={errors.name} />
      <Field label={t('request.age')} value={f.age} onChangeText={set('age')} keyboardType="number-pad" error={errors.age} />
      {choices('gender', GENDERS)}
      <Field label={t('request.phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={errors.phone} />
      <Field label={t('request.address')} value={f.address} onChangeText={set('address')} multiline error={errors.address} />
      <Field label={t('request.condition')} value={f.condition} onChangeText={set('condition')} multiline error={errors.condition} />
      <Field label={t('request.need')} value={f.need} onChangeText={set('need')} error={errors.need} />
      {choices('category', PATIENT_CATEGORIES)}
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.label}>{t('request.supportTypes')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SUPPORT_TYPES.map((s) => (
            <Chip key={s} label={t(`values.${s}`)} selected={f.supportTypes.includes(s)} onPress={() => toggleSupport(s)} />
          ))}
        </View>
        {errors.supportTypes && <Text style={styles.error}>{errors.supportTypes}</Text>}
      </View>
      <Field label={t('request.relation')} value={f.relation} onChangeText={set('relation')} />
      <Field label={t('request.note')} value={f.note} onChangeText={set('note')} multiline />
      <Button title={t('common.submit')} onPress={submit} loading={busy} />
    </ScrollView>
  );
}
