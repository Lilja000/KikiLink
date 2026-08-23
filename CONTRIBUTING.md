# Contributing to KikiLink

KikiLink is intentionally developed as an original implementation.

## Ground rules

- Do not paste or port code from another Bondage Club addon.
- Feature ideas and interoperability research are welcome, but implementations
  must be written for KikiLink's own interfaces.
- Use ModSDK hooks instead of overwriting Bondage Club functions.
- Never bypass Bondage Club permissions, locks, access rules, or consent checks.
- New modules must be independently disableable and cleanly disposable.
- Keep data local unless a future feature explicitly documents otherwise.

## Development

```bash
npm install
npm run check
```

The installable userscript is generated at `dist/KikiLink.user.js`.
