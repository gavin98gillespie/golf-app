const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// NativeWind 4's virtual-module change events are incompatible with SDK 57's
// Metro file map (addedFiles is missing). Use its supported disk output mode.
module.exports = withNativeWind(config, {
  input: './global.css',
  forceWriteFileSystem: true,
});
