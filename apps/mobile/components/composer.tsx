import { View } from "react-native";

import { Button } from "./button";
import { TextField } from "./text-field";

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
}

export function Composer({ value, onChangeText, onSend, placeholder }: ComposerProps) {
  return (
    <View
      className="flex-row items-end gap-sm border-t border-border bg-surface px-md py-sm"
      testID="composer"
    >
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button title="Send" onPress={onSend} variant="primary" />
    </View>
  );
}
