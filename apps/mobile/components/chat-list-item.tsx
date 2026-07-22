import { Pressable, Text, View } from "react-native";

import { Avatar } from "./avatar";
import { Badge } from "./badge";

export interface ChatListItemProps {
  name: string;
  message: string;
  timestamp: string;
  unreadCount?: number;
  avatarUri?: string;
  onPress?: () => void;
}

export function ChatListItem({
  name,
  message,
  timestamp,
  unreadCount,
  avatarUri,
  onPress,
}: ChatListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      testID="chat-list-item"
      className="flex-row items-center gap-md bg-surface px-lg py-md"
    >
      <Avatar name={name} uri={avatarUri} size="md" />
      <View className="flex-1 gap-xs">
        <View className="flex-row justify-between">
          <Text className="text-base font-semibold text-on-surface">{name}</Text>
          <Text className="text-xs text-muted">{timestamp}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
            {message}
          </Text>
          {unreadCount ? <Badge count={unreadCount} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
