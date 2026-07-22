import { Text, TextInput, View } from "react-native";

export interface TextFieldProps {
  label?: string | undefined;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string | undefined;
  error?: string | undefined;
  secureTextEntry?: boolean;
  className?: string | undefined;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  className = "",
}: TextFieldProps) {
  return (
    <View className={`gap-xs ${className}`}>
      {label ? <Text className="text-sm text-muted">{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        testID="text-field-input"
        className="rounded-md border border-border bg-surface px-md py-sm text-base text-on-surface"
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
