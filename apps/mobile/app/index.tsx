import { Text, View } from "react-native";

import { APP_TAGLINE } from "../src/lib/placeholder";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">tm-whatsapp</Text>
      <Text className="mt-2 text-base text-slate-500">{APP_TAGLINE}</Text>
    </View>
  );
}
