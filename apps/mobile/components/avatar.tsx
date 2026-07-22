import { Image, Text, View } from "react-native";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  uri?: string | undefined;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-2xl",
};

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, uri, size = "md" }: AvatarProps) {
  return (
    <View
      className={`items-center justify-center rounded-full bg-primary ${sizeClasses[size]}`}
      testID="avatar"
    >
      {uri ? (
        <Image source={{ uri }} className="h-full w-full rounded-full" accessibilityLabel={name} />
      ) : (
        <Text className="font-bold text-white">{initialsFrom(name)}</Text>
      )}
    </View>
  );
}
