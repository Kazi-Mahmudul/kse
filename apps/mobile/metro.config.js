const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Optimization: Redirect '@expo/vector-icons' to our trimmed shim
// The app only uses Ionicons; importing from the root '@expo/vector-icons'
// causes Metro to bundle 18 unused icon font families (~4.5MB of TTFs).
const shimPath = path.resolve(__dirname, 'src/lib/vector-icons-shim.js');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/vector-icons') {
    return {
      filePath: shimPath,
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

