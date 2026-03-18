const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { join } = require("path");

// Buffer polyfill for Metro (fix for react-native-svg)
const bufferPolyfillPath = join(__dirname, "node_modules", "buffer");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver?.extraNodeModules,
  buffer: bufferPolyfillPath,
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  configPath: "tailwind.config.js",
});
