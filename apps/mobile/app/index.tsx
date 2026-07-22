import { Text, View } from "react-native";

import { APP_TAGLINE } from "../src/lib/placeholder";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-chat-bg p-lg">
      <Text className="text-2xl font-bold text-on-background">tm-whatsapp</Text>
      <Text className="mt-sm text-base text-muted">{APP_TAGLINE}</Text>
    </View>
  );
}
