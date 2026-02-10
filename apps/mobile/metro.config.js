const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ❌ GOLDEN RULE: Block web-only packages from React Native
// Never use packages containing: react-dom, radix, aria, web
config.resolver.blockList = [
    // Web drawer/dialog libraries
    /node_modules\/vaul\/.*/,

    // Radix UI (web-only)
    /node_modules\/@radix-ui\/.*/,

    // React Aria (web-only)
    /node_modules\/@react-aria\/.*/,
    /node_modules\/react-aria\/.*/,

    // Other common web-only patterns
    /node_modules\/.*-web\/.*/, // Matches *-web packages
];

// Force all packages to use the same React instance
config.resolver.extraNodeModules = {
    react: path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
};

module.exports = config;
