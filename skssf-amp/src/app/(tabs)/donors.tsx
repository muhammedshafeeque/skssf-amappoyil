import { where } from '@react-native-firebase/firestore';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { BLOOD_GROUPS, DEFAULT_ELIGIBILITY_GAP_DAYS, compatibleDonorGroups, donorEligibility } from '../../shared';
import type { AppSettings, BloodDonor, BloodGroup } from '../../shared';
import { Card, Chip, ContactButtons, Empty, OfflineBanner, Pill, colors, prettyPhone, styles } from '../../components/ui';
import { useCollection, useDocument } from '../../lib/data';

export default function DonorsScreen() {
  const { t } = useTranslation();
  const donors = useCollection<BloodDonor>('bloodDonors', [where('active', '==', true)], 'active');
  const { data: settings } = useDocument<AppSettings>('settings/app');
  const gap = settings?.eligibilityGapDays ?? DEFAULT_ELIGIBILITY_GAP_DAYS;
  const [group, setGroup] = useState<BloodGroup | null>(null);
  const [compatible, setCompatible] = useState(false);
  const [localOnly, setLocalOnly] = useState(true);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const groups = group ? (compatible ? compatibleDonorGroups(group) : [group]) : null;
    const q = search.trim().toLowerCase();
    return donors.data
      .map((d) => ({ ...d, elig: donorEligibility(d.lastDonated, gap) }))
      .filter((d) => !groups || groups.includes(d.bloodGroup))
      .filter((d) => !localOnly || d.isLocal)
      .filter((d) => !q || d.nameLower.includes(q) || d.location.place.toLowerCase().includes(q))
      .sort((a, b) => Number(b.available && b.elig.eligible) - Number(a.available && a.elig.eligible) || a.elig.daysLeft - b.elig.daysLeft || a.nameLower.localeCompare(b.nameLower));
  }, [donors.data, group, compatible, localOnly, search, gap]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View>
          <OfflineBanner show={donors.fromCache && donors.data.length > 0} />
          <TextInput value={search} onChangeText={setSearch} placeholder={t('donors.search')} placeholderTextColor={colors.muted} style={[styles.input, { marginBottom: 10 }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Chip label={t('donors.all')} selected={!group} onPress={() => setGroup(null)} tone="blood" />
            {BLOOD_GROUPS.map((g) => (
              <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} tone="blood" />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 }}>
            <Text style={styles.muted}>{t('donors.compatible')}</Text>
            <Switch value={compatible} onValueChange={setCompatible} disabled={!group} trackColor={{ true: colors.blood }} />
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <Chip label={t('donors.local')} selected={localOnly} onPress={() => setLocalOnly(true)} />
            <Chip label={t('donors.anywhere')} selected={!localOnly} onPress={() => setLocalOnly(false)} />
          </View>
        </View>
      }
      ListEmptyComponent={<Empty text={t('donors.empty')} loading={donors.loading} />}
      renderItem={({ item: d }) => (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bloodSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ color: colors.blood, fontWeight: '800' }}>{d.bloodGroup}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{d.name}</Text>
              <Text style={styles.muted}>
                {d.location.place}
                {d.location.country !== 'India' ? `, ${d.location.country}` : ''}
              </Text>
              <Text style={[styles.muted, { fontSize: 12 }]}>{d.lastDonated ? t('donors.lastDonated', { date: d.lastDonated }) : t('donors.neverDonated')}</Text>
            </View>
            {!d.available ? <Pill label={t('donors.unavailable')} /> : d.elig.eligible ? <Pill tone="success" label={t('donors.canDonate')} /> : <Pill tone="warn" label={t('donors.inDays', { n: d.elig.daysLeft })} />}
          </View>
          <View style={{ marginTop: 10 }}>
            {d.hideNumber ? (
              <Text style={[styles.muted, { fontSize: 12 }]}>{t('donors.hidden')}</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text }}>{prettyPhone(d.phone)}</Text>
                <ContactButtons phone={d.phone} />
              </View>
            )}
          </View>
        </Card>
      )}
    />
  );
}
