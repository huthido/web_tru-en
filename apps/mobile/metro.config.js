// Expo's default Metro config.
//
// `@web-truyen/shared` is currently consumed only through `import type`
// (erased before bundling), so Metro needs no extra resolver wiring for it —
// the tsconfig.json path alias is enough for type-checking.
//
// When a future phase imports shared code at *runtime*, re-add the package to
// `watchFolders` + `resolver.extraNodeModules` here (Expo monorepo pattern).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
