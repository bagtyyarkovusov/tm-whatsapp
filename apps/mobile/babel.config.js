module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // NativeWind 4.2.x's preset hard-codes `react-native-worklets/plugin`, which only
      // exists for Reanimated 4+. Expo SDK 53 ships Reanimated ~3.17, whose worklet
      // plugin lives at `react-native-reanimated/plugin` (ADR-0004 stack clone).
      require("react-native-css-interop/dist/babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        { runtime: "automatic", importSource: "react-native-css-interop" },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
