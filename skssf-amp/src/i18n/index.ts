import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ml } from './ml';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ml', label: 'മലയാളം' },
] as const;
const KEY = 'skamp.language';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ml: { translation: ml } },
  lng: getLocales()[0]?.languageCode === 'ml' ? 'ml' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
  })
  .catch(() => undefined);

export async function setLanguage(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(KEY, code);
}

export default i18n;
