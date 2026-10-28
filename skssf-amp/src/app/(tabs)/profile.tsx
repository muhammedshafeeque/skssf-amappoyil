import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { Avatar, Button, Card, Chip, Row, colors, prettyPhone, styles } from '../../components/ui';
import { LANGUAGES, setLanguage } from '../../i18n';
import { useSession } from '../../lib/auth';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { member, logout } = useSession();
  if (!member) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Avatar uri={member.photoUrl} name={member.name} size={96} />
        <Text style={[styles.h1, { marginTop: 10 }]}>{member.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{member.memberId}</Text>
      </View>
      <Card>
        {member.skssfId && <Row label={t('profile.skssfId')} value={member.skssfId} />}
        <Row label={t('profile.phone')} value={prettyPhone(member.phone)} />
        <Row label={t('profile.blood')} value={member.bloodGroup} />
        <Row label={t('profile.dob')} value={member.dob} />
        <Row label={t('profile.father')} value={member.fatherName} />
        <Row label={t('profile.house')} value={member.houseName} />
        <Row label={t('profile.address')} value={member.address} />
        <Text style={[styles.muted, { fontSize: 12, marginTop: 8 }]}>{t('profile.correction')}</Text>
      </Card>
      <Button title={t('profile.myDonor')} variant="outline" icon="water-outline" onPress={() => router.push('/my-donor')} />
      <Button title={t('profile.myRequests')} variant="outline" icon="document-text-outline" onPress={() => router.push('/my-requests')} />
      <Card style={{ marginTop: 16 }}>
        <Text style={[styles.label]}>{t('profile.language')}</Text>
        <View style={{ flexDirection: 'row' }}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={l.label} selected={i18n.language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </Card>
      <Button title={t('profile.logout')} variant="danger" icon="log-out-outline" onPress={logout} />
    </ScrollView>
  );
}
