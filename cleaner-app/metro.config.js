const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// This Expo app lives inside the Ample Cleaners repo. Keep Metro scoped to
// this project so the bundler resolves this app's own node_modules first.
config.watchFolders = [path.resolve(__dirname)];

module.exports = withNativeWind(config, { input: "./global.css" });
