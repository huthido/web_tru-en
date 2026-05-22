import { registerRootComponent } from 'expo';

import App from './App';

// Explicit entry point. We avoid the default `expo/AppEntry.js` because, under
// pnpm, that file lives at a symlinked `.pnpm/...` path where its internal
// `import '../../App'` no longer resolves to the project root.
registerRootComponent(App);
