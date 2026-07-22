import { Text, View } from "react-native";

export interface BadgeProps {
  count: number;
}

export function Badge({ count }: BadgeProps) {
  const label = count > 99 ? "99+" : String(count);

  return (
    <View
      className="h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5"
      testID="badge"
    >
      <Text className="text-2xs font-semibold text-white">{label}</Text>
    </View>
  );
}
