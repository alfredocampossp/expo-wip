import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from './en.json';
import pt from './pt.json';

const i18n = new I18n({
  en,
  pt,
});

i18n.locale = Localization.locale.split('-')[0];
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;