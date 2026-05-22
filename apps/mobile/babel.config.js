module.exports = function (api) {
    api.cache(true);
    // The `@/*` path alias is resolved by Expo/Metro from tsconfig.json
    // `compilerOptions.paths` — no babel-plugin-module-resolver needed.
    return {
        presets: ['babel-preset-expo'],
    };
};
