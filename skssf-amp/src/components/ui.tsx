import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

export const colors = {
  primary: '#0B6E4F',
  primaryDark: '#0B3D2E',
  primarySoft: '#E3F1EC',
  blood: '#C0392B',
  bloodSoft: '#FBEAE8',
  bg: '#F5F7F6',
  card: '#FFFFFF',
  text: '#1B2420',
  muted: '#5F6B66',
  border: '#E1E7E4',
  warn: '#B7791F',
  warnSoft: '#FDF3E1',
  info: '#1D6FA5',
  infoSoft: '#E5F1F9',
};

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Button({ title, onPress, disabled, loading, variant = 'primary', icon }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'outline' | 'text' | 'danger'; icon?: keyof typeof Ionicons.glyphMap }) {
  const outline = variant === 'outline' || variant === 'text';
  const color = variant === 'danger' ? colors.blood : outline ? colors.primary : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary },
        variant === 'danger' && { borderWidth: 1, borderColor: colors.blood },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={18} color={color} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error && { borderColor: colors.blood }, props.style]} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, tone = 'primary' }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'primary' | 'blood' }) {
  const c = tone === 'blood' ? colors.blood : colors.primary;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: c }, selected && { backgroundColor: c }]}>
      <Text style={{ color: selected ? '#fff' : c, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const TONES: Record<string, [string, string]> = {
  success: [colors.primary, colors.primarySoft],
  danger: [colors.blood, colors.bloodSoft],
  warn: [colors.warn, colors.warnSoft],
  info: [colors.info, colors.infoSoft],
  muted: [colors.muted, '#EEF1EF'],
};

export function Pill({ label, tone = 'muted' }: { label: string; tone?: keyof typeof TONES }) {
  const [fg, bg] = TONES[tone]!;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" cachePolicy="disk" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size / 2.4 }}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function Empty({ text, loading }: { text: string; loading?: boolean }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.muted }}>{text}</Text>}
    </View>
  );
}

export function OfflineBanner({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <View style={{ backgroundColor: colors.warnSoft, padding: 8, borderRadius: 8, marginBottom: 8 }}>
      <Text style={{ color: colors.warn, fontSize: 12, textAlign: 'center' }}>{t('common.offline')}</Text>
    </View>
  );
}

/** Call and WhatsApp buttons for a phone number in E.164 form. */
export function ContactButtons({ phone, message }: { phone: string; message?: string }) {
  const { t } = useTranslation();
  const wa = `https://wa.me/${phone.replace('+', '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={[styles.contact, { backgroundColor: colors.primary }]} accessibilityLabel={t('common.call')}>
        <Ionicons name="call" size={16} color="#fff" />
        <Text style={styles.contactText}>{t('common.call')}</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL(wa)} style={[styles.contact, { backgroundColor: '#25D366' }]} accessibilityLabel="WhatsApp">
        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
        <Text style={styles.contactText}>{t('common.whatsapp')}</Text>
      </Pressable>
    </View>
  );
}

export function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, marginTop: 2 }}>{value || '—'}</Text>
    </View>
  );
}

export const prettyPhone = (p: string) => (p.startsWith('+91') && p.length === 13 ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p);

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, marginTop: 8 },
  buttonText: { fontWeight: '700', fontSize: 15 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colors.text },
  error: { color: colors.blood, fontSize: 12, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  pill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  contact: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 6 },
  contactText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
