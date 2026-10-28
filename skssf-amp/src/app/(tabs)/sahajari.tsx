import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import type { Equipment, PatientPublic } from '../../shared';
import { Button, Card, Chip, Empty, OfflineBanner, Pill, colors, styles } from '../../components/ui';
import { useCollection } from '../../lib/data';

const STATUS_TONE = { available: 'success', assigned: 'info', maintenance: 'warn', retired: 'muted' } as const;

export default function SahajariScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'equipment' | 'patients'>('equipment');
  const equipment = useCollection<Equipment>('equipment');
  const patients = useCollection<PatientPublic>('patientsPublic');

  const byType = useMemo(() => {
    const m = new Map<string, Equipment[]>();
    equipment.data.filter((e) => e.status !== 'retired').forEach((e) => m.set(e.type, [...(m.get(e.type) ?? []), e]));
    return [...m.entries()];
  }, [equipment.data]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner show={equipment.fromCache && equipment.data.length > 0} />
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Chip label={t('sahajari.equipment')} selected={tab === 'equipment'} onPress={() => setTab('equipment')} />
        <Chip label={t('sahajari.patients')} selected={tab === 'patients'} onPress={() => setTab('patients')} />
      </View>

      {tab === 'equipment' &&
        (byType.length === 0 ? (
          <Empty text={t('common.none')} loading={equipment.loading} />
        ) : (
          byType.map(([type, items]) => {
            const free = items.filter((i) => i.status === 'available').length;
            return (
              <Card key={type}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.h2}>{t(`values.${type}`, { defaultValue: type })}</Text>
                  <Pill tone={free > 0 ? 'success' : 'danger'} label={`${free}/${items.length} ${t('sahajari.available')}`} />
                </View>
                {items.map((e) => (
                  <View key={e.code} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.text, flex: 1 }}>
                      {e.code} · {e.name}
                    </Text>
                    <Pill tone={STATUS_TONE[e.status]} label={t(`values.${e.status}`)} />
                  </View>
                ))}
              </Card>
            );
          })
        ))}

      {tab === 'patients' && (
        <>
          <Text style={[styles.muted, { marginBottom: 8 }]}>{t('sahajari.patientsNote')}</Text>
          {patients.data.length === 0 && <Empty text={t('common.none')} loading={patients.loading} />}
          {patients.data.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{p.name}</Text>
                <Pill tone={p.status === 'active' ? 'success' : 'info'} label={t(`values.${p.status}`)} />
              </View>
              <Text style={{ color: colors.text, marginTop: 4 }}>{p.need}</Text>
              <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{t(`values.${p.category}`)}</Text>
            </Card>
          ))}
        </>
      )}

      <Button title={t('sahajari.requestPatient')} icon="add-circle-outline" onPress={() => router.push('/request-patient')} />
      <Button title={t('sahajari.myRequests')} variant="outline" onPress={() => router.push('/my-requests')} />
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <Ionicons name="heart" size={20} color={colors.blood} />
      </View>
    </ScrollView>
  );
}
