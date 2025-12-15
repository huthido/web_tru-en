# Husky Git Hooks (Optional)

Husky can be set up for pre-commit hooks to ensure code quality.

## Setup (Optional)

```bash
npm install --save-dev husky lint-staged
npx husky init
```

## Recommended Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run format:check
```

## Why Optional?

- **Solo Developer**: May slow down development
- **Team**: Highly recommended for consistency
- **CI/CD**: Can enforce checks in CI instead

## Recommendation

For this project, we recommend:
- **Solo dev**: Skip Husky, use CI/CD for checks
- **Team**: Install Husky for pre-commit hooks

