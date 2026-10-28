import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import type { CommitteeMember } from '../../shared';
import { Avatar, Card, Chip, ContactButtons, Empty, OfflineBanner, colors, styles } from '../../components/ui';
import { useCollection } from '../../lib/data';

export default function CommitteeScreen() {
  const { t } = useTranslation();
  const all = useCollection<CommitteeMember>('committee');
  const [showPast, setShowPast] = useState(false);

  const current = useMemo(() => all.data.filter((c) => c.isCurrent).sort((a, b) => a.order - b.order), [all.data]);
  const past = useMemo(() => {
    const m = new Map<string, CommitteeMember[]>();
    all.data.filter((c) => !c.isCurrent).forEach((c) => m.set(c.term, [...(m.get(c.term) ?? []), c]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [all.data]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OfflineBanner show={all.fromCache && all.data.length > 0} />
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Chip label={t('committee.current')} selected={!showPast} onPress={() => setShowPast(false)} />
        <Chip label={t('committee.past')} selected={showPast} onPress={() => setShowPast(true)} />
      </View>
      {!showPast && current[0] && <Text style={[styles.muted, { marginBottom: 8 }]}>{t('committee.term', { term: current[0].term })}</Text>}
      {!showPast &&
        (current.length === 0 ? (
          <Empty text={t('committee.empty')} loading={all.loading} />
        ) : (
          current.map((c) => (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar uri={c.photoUrl} name={c.name} size={56} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{c.name}</Text>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{c.designation}</Text>
                </View>
              </View>
              <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <ContactButtons phone={c.phone} />
              </View>
            </Card>
          ))
        ))}
      {showPast &&
        (past.length === 0 ? (
          <Empty text={t('common.none')} />
        ) : (
          past.map(([term, list]) => (
            <Card key={term}>
              <Text style={[styles.h2, { marginBottom: 6 }]}>{t('committee.term', { term })}</Text>
              {list
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <Text key={c.name + c.designation} style={{ color: colors.text, paddingVertical: 3 }}>
                    {c.designation}: {c.name}
                  </Text>
                ))}
            </Card>
          ))
        ))}
    </ScrollView>
  );
}
