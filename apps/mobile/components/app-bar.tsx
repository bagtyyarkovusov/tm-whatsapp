import { type ReactNode } from "react";
import { Text, View } from "react-native";

export interface AppBarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function AppBar({ title, left, right }: AppBarProps) {
  return (
    <View
      className="flex-row items-center justify-between border-b border-border bg-surface px-lg py-md"
      testID="app-bar"
    >
      <View className="w-1/4">{left}</View>
      <Text className="flex-1 text-center text-lg font-semibold text-on-surface" numberOfLines={1}>
        {title}
      </Text>
      <View className="w-1/4 items-end">{right}</View>
    </View>
  );
}
