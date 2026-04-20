# Security

## Credentials

Do not commit npm tokens, `.npmrc` files, `.env` files, private keys, or local publish credentials to this repository.

Before committing or publishing, run:

```bash
npm run check:secrets
```

`npm test`, `npm publish`, and the repository pre-commit hook already run this check. The scanner reports only file paths, not secret values.

To enable the committed git hook in a local clone:

```bash
git config core.hooksPath .githooks
```

If a token was pasted into a terminal, chat, log, or local file, revoke it in npm and create a new one before using it again.
