import 'bootstrap';
import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { HashRouter } from 'react-router-dom';

import App from './examples/slickgrid/App';
import localeEn from './assets/locales/en/translation.json';
import localeFr from './assets/locales/fr/translation.json';
import './styles.scss';

i18n
  .use(Backend)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    // backend: {
    //     loadPath: 'assets/locales/{{lng}}/{{ns}}.json',
    // },
    resources: {
      en: { translation: localeEn },
      fr: { translation: localeFr },
    },
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    }
  });

const mainContainer = document.getElementById('main') as HTMLElement;
const root = createRoot(mainContainer);
root.render(
  // @ts-ignore
  <HashRouter>
    <App />
  </HashRouter>
);
