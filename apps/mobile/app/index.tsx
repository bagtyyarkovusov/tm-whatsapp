import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { SUPPORTED_LOCALES, useLocale, type Locale } from "../src/i18n";

export default function Index() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text
        accessibilityLabel={t("app.name")}
        className="text-2xl font-bold text-slate-900 dark:text-slate-100"
      >
        {t("app.name")}
      </Text>
      <Text className="mt-2 text-base text-slate-500">{t("app.tagline")}</Text>
      <Text
        accessibilityRole="header"
        className="mt-8 text-sm font-semibold uppercase text-slate-400"
      >
        {t("settings.language.label")}
      </Text>
      <View className="mt-2 flex-row gap-2">
        {SUPPORTED_LOCALES.map((option: Locale) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={t(`settings.language.${option}`)}
            accessibilityState={{ selected: option === locale }}
            onPress={() => setLocale(option)}
            className={`rounded-full px-4 py-2 ${
              option === locale
                ? "bg-slate-900 dark:bg-slate-100"
                : "bg-slate-200 dark:bg-slate-800"
            }`}
          >
            <Text
              className={
                option === locale
                  ? "text-white dark:text-black"
                  : "text-slate-900 dark:text-slate-100"
              }
            >
              {t(`settings.language.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
