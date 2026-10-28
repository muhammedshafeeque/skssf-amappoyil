import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, Text, useWindowDimensions } from 'react-native';
import type { Post } from '../../shared';
import { Button, Empty, styles } from '../../components/ui';
import { useDocument } from '../../lib/data';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { data: post, loading } = useDocument<Post>(`posts/${id}`);
  if (!post) return <Empty text={t('common.none')} loading={loading} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{post.title}</Text>
      <Text style={[styles.muted, { marginVertical: 6 }]}>{post.publishedAt?.toDate().toLocaleString()}</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 16 }}>{post.body}</Text>
      {post.images.map((uri) => (
        <Image key={uri} source={{ uri }} style={{ width: width - 32, height: (width - 32) * 0.75, borderRadius: 12, marginBottom: 12 }} contentFit="cover" cachePolicy="disk" />
      ))}
      <Button title="Share" variant="outline" icon="share-social-outline" onPress={() => Share.share({ message: `${post.title}\n\n${post.body}` })} />
    </ScrollView>
  );
}
