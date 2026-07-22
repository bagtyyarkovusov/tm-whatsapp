import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, FALLBACK_LOCALE } from "./config";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import tk from "./locales/tk.json";

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  defaultNS: "translation",
  // Catalogs are flat JSON with dot-notation keys, so keys are matched literally.
  keySeparator: false,
  nsSeparator: false,
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    tk: { translation: tk },
  },
  interpolation: {
    // React already escapes rendered values; never leak raw interpolation input.
    escapeValue: false,
  },
  returnEmptyString: false,
  // Missing keys fail CI via `i18n:check`; render the key rather than sensitive input.
  returnNull: false,
});

export default i18n;
