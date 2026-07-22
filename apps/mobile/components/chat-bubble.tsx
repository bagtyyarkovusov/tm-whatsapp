import { type ReactNode } from "react";
import { Text, View } from "react-native";

export type MessageStatus = "sent" | "delivered" | "read";

export interface ChatBubbleProps {
  children: ReactNode;
  isOutgoing?: boolean;
  timestamp?: string;
  status?: MessageStatus;
}

export function ChatBubble({ children, isOutgoing = false, timestamp, status }: ChatBubbleProps) {
  const bubbleClass = isOutgoing ? "bg-outgoing" : "bg-incoming";

  return (
    <View className={`my-xs max-w-[80%] rounded-lg px-md py-sm ${bubbleClass}`}>
      <Text className="text-base text-on-background">{children}</Text>
      {(timestamp || status) && (
        <View className="mt-2xs flex-row items-center gap-2xs self-end">
          {timestamp ? <Text className="text-2xs text-muted">{timestamp}</Text> : null}
          {isOutgoing && status ? (
            <View className="h-3 w-3 rounded-full bg-status" testID={`message-status-${status}`} />
          ) : null}
        </View>
      )}
    </View>
  );
}
