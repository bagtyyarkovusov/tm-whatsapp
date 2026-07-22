import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, resolveLocale, type Locale } from "./config";
import i18n from "./instance";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

/**
 * Bootstraps i18next for the app. The launch locale is Turkmen; the device OS
 * locale is intentionally ignored (expo-localization is installed per the
 * settled engine decision but not consulted for locale selection). A stored
 * choice under `@tm/locale` wins once loaded from AsyncStorage.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const resolved = resolveLocale(stored);
        setLocaleState(resolved);
        void i18n.changeLanguage(resolved);
      })
      .catch(() => {
        // Storage unreadable: keep the default Turkmen locale.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        void i18n.changeLanguage(next);
        AsyncStorage.setItem(LOCALE_STORAGE_KEY, next).catch(() => {
          // Persistence failure leaves the in-memory locale applied.
        });
      },
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
