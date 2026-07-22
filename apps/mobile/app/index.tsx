import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { SUPPORTED_LOCALES, useLocale, type Locale } from "../src/i18n";

export default function Index() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <View className="flex-1 items-center justify-center bg-chat-bg p-lg">
      <Text accessibilityLabel={t("app.name")} className="text-2xl font-bold text-on-background">
        {t("app.name")}
      </Text>
      <Text className="mt-sm text-base text-muted">{t("app.tagline")}</Text>
      <Text accessibilityRole="header" className="mt-8 text-sm font-semibold uppercase text-muted">
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
            className={`items-center justify-center rounded-lg px-4 py-2 ${
              option === locale ? "bg-primary" : "bg-surface border border-border"
            }`}
          >
            <Text className={option === locale ? "text-white" : "text-on-surface"}>
              {t(`settings.language.${option}`)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
