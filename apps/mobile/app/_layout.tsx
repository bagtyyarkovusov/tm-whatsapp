import { Stack } from "expo-router";

import "../global.css";
import { I18nProvider } from "../src/i18n";

export default function RootLayout() {
  return (
    <I18nProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </I18nProvider>
  );
}
