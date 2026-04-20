# Security

## Credentials

Do not commit npm tokens, `.npmrc` files, `.env` files, private keys, or local publish credentials to this repository.

Before committing or publishing, run:

```bash
npm run check:secrets
```

`npm test` and `npm publish` already run this check. The scanner reports only file paths, not secret values.

If a token was pasted into a terminal, chat, log, or local file, revoke it in npm and create a new one before using it again.
