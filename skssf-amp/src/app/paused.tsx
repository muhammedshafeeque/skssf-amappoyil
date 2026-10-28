import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors, styles } from '../components/ui';
import { useSession } from '../lib/auth';

export default function PausedScreen() {
  const { t } = useTranslation();
  const { logout } = useSession();
  return (
    <SafeAreaView style={[styles.screen, { justifyContent: 'center', padding: 24 }]}>
      <View style={{ alignItems: 'center' }}>
        <Ionicons name="pause-circle" size={72} color={colors.warn} />
        <Text style={[styles.h1, { marginTop: 12, textAlign: 'center' }]}>{t('paused.title')}</Text>
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>{t('paused.text')}</Text>
      </View>
      <Button title={t('paused.back')} variant="outline" onPress={logout} />
    </SafeAreaView>
  );
}
