import { Pressable, Text } from "react-native";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

const containerClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
  ghost: "bg-transparent",
};

const titleClasses: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-on-surface",
  ghost: "text-primary",
};

export function Button({ title, onPress, variant = "primary", disabled = false }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID="button"
      className={`items-center justify-center rounded-lg px-lg py-sm active:opacity-80 ${containerClasses[variant]} ${disabled ? "opacity-50" : ""}`}
    >
      <Text className={`text-base font-semibold ${titleClasses[variant]}`}>{title}</Text>
    </Pressable>
  );
}
