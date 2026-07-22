/* eslint-disable @typescript-eslint/no-explicit-any */
import { createElement, forwardRef } from "react";

export const View = forwardRef<unknown, any>(function View(props, ref) {
  const { children, className, testID, style, ...rest } = props;
  return createElement("div", { ref, className, "data-testid": testID, style, ...rest }, children);
}) as any;

export const Text = forwardRef<unknown, any>(function Text(props, ref) {
  const { children, className, testID, style, numberOfLines, ...rest } = props;
  void numberOfLines;
  return createElement("span", { ref, className, "data-testid": testID, style, ...rest }, children);
}) as any;

export const Pressable = forwardRef<unknown, any>(function Pressable(props, ref) {
  const { children, className, testID, style, onPress, disabled, ...rest } = props;
  return createElement(
    "button",
    {
      ref,
      className,
      "data-testid": testID,
      style,
      onClick: onPress,
      disabled,
      ...rest,
    },
    children,
  );
}) as any;

export const TextInput = forwardRef<unknown, any>(function TextInput(props, ref) {
  const { className, testID, style, value, onChangeText, secureTextEntry, placeholder, ...rest } =
    props;
  return createElement("input", {
    ref,
    className,
    "data-testid": testID,
    style,
    value,
    placeholder,
    type: secureTextEntry ? "password" : "text",
    onChange: onChangeText ? (event: any) => onChangeText(event.target.value) : undefined,
    ...rest,
  });
}) as any;

export const Image = forwardRef<unknown, any>(function Image(props, ref) {
  const { source, className, testID, style, accessibilityLabel, ...rest } = props;
  void accessibilityLabel;
  return createElement("img", {
    ref,
    className,
    "data-testid": testID,
    style,
    src: source?.uri,
    ...rest,
  });
}) as any;

export function useColorScheme() {
  return "light";
}

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  flatten: (style: any) => style,
};

export const Platform = {
  OS: "ios" as const,
  select<T>(spec: Record<string, T>): T {
    return ("ios" in spec ? spec.ios : spec.default) as T;
  },
};

export type ViewProps = any;
export type TextProps = any;
export type PressableProps = any;
export type TextInputProps = any;
export type ImageProps = any;

export default {
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  useColorScheme,
  StyleSheet,
  Platform,
};
