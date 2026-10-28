import Ionicons from '@expo/vector-icons/Ionicons';
import { limit, orderBy, where } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import type { Post } from '../../shared';
import { Card, Empty, OfflineBanner, colors, styles } from '../../components/ui';
import { useCollection } from '../../lib/data';

const PAGE = 15;

export default function FeedScreen() {
  const { t } = useTranslation();
  const [count, setCount] = useState(PAGE);
  // Pinned first, newest first; the limit grows as the member scrolls.
  const posts = useCollection<Post>('posts', [where('status', '==', 'published'), orderBy('pinned', 'desc'), orderBy('publishedAt', 'desc'), limit(count)], String(count));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={posts.data}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={<OfflineBanner show={posts.fromCache && posts.data.length > 0} />}
      ListEmptyComponent={<Empty text={t('feed.empty')} loading={posts.loading} />}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => setCount(PAGE)} />}
      onEndReached={() => posts.data.length >= count && setCount((c) => c + PAGE)}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <Card onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })} style={{ padding: 0, overflow: 'hidden' }}>
          {item.images[0] && <Image source={{ uri: item.images[0] }} style={{ width: '100%', aspectRatio: 16 / 9 }} contentFit="cover" cachePolicy="disk" />}
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {item.pinned && (
                <>
                  <Ionicons name="pin" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginRight: 8 }}>{t('feed.pinned')}</Text>
                </>
              )}
              <Text style={[styles.muted, { fontSize: 12 }]}>{item.publishedAt?.toDate().toLocaleDateString()}</Text>
            </View>
            <Text style={styles.h2}>{item.title}</Text>
            <Text style={{ color: colors.text, marginTop: 4 }} numberOfLines={3}>
              {item.body}
            </Text>
            {item.images.length > 1 && <Text style={[styles.muted, { marginTop: 6, fontSize: 12 }]}>+{item.images.length - 1} 📷</Text>}
          </View>
        </Card>
      )}
    />
  );
}
