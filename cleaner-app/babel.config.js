module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: { "@": "." },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // react-native-worklets/plugin (Reanimated 4) MUST be listed last.
      "react-native-worklets/plugin",
    ],
  };
};
