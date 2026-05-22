// Metro config — extends the Expo defaults so the app can import the
// `@web-truyen/shared` package's TypeScript source.
//
// apps/mobile is a STANDALONE pnpm project (intentionally excluded from
// pnpm-workspace.yaml), so `@web-truyen/shared` is not installed as a
// node_module. We point Metro at the package directory directly and add it
// to watchFolders so Metro transpiles its `.ts` source.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedPkg = path.resolve(projectRoot, '../../packages/shared');

const config = getDefaultConfig(projectRoot);

// Watch + transpile the shared package's source.
config.watchFolders = [sharedPkg];

// Resolve the bare specifier `@web-truyen/shared` to the package directory;
// Metro then reads its package.json `main` (./src/index.ts).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@web-truyen/shared': sharedPkg,
};

module.exports = config;
