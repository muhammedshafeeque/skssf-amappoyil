import { orderBy, where } from '@react-native-firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Text, View } from 'react-native';
import type { RequestDoc } from '../shared';
import { Button, Card, Empty, Pill, colors, styles } from '../components/ui';
import { useSession } from '../lib/auth';
import { callFn, errorMessage, useCollection } from '../lib/data';

const TONE = { pending: 'warn', approved: 'success', rejected: 'danger', cancelled: 'muted' } as const;

export default function MyRequestsScreen() {
  const { t } = useTranslation();
  const { user } = useSession();
  const requests = useCollection<RequestDoc>('requests', [where('requestedBy.uid', '==', user?.uid ?? ''), orderBy('createdAt', 'desc')], user?.uid);

  const cancel = (id: string) =>
    Alert.alert(t('requests.cancel'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => callFn('cancelRequest', { requestId: id }).catch((e) => Alert.alert(t('common.error'), errorMessage(e))),
      },
    ]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={requests.data}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<Empty text={t('requests.empty')} loading={requests.loading} />}
      renderItem={({ item: r }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{t(`values.${r.type}`)}</Text>
            <Pill tone={TONE[r.status]} label={t(`values.${r.status}`)} />
          </View>
          <Text style={{ color: colors.text, marginTop: 6 }}>
            {r.payload.name} — {r.payload.need}
          </Text>
          <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>{r.createdAt?.toDate().toLocaleString()}</Text>
          {r.review?.note && (
            <View style={{ backgroundColor: colors.bg, borderRadius: 8, padding: 8, marginTop: 8 }}>
              <Text style={[styles.muted, { fontSize: 12 }]}>{t('requests.note')}</Text>
              <Text style={{ color: colors.text }}>{r.review.note}</Text>
            </View>
          )}
          {r.status === 'pending' && <Button title={t('requests.cancel')} variant="text" onPress={() => cancel(r.id)} />}
        </Card>
      )}
    />
  );
}
