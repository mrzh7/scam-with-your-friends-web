# Contributing

Use Node.js 24, run `npm ci`, then `npm test` and `npm run build`. See [deployment](docs/DEPLOYMENT.md) for a separate authenticated Worker development environment. Test on your own deployment and database, never against the maintained public demo without permission.

Please open an issue for major changes. Make focused pull requests with a concrete problem statement, verification and screenshots for UI changes. Run `npm run check` before submitting. Test account, save and multiplayer changes against a separate database.

The interface supports en, zh, pt, ja and es. Keep source message keys, `src/i18n/messages.json` and all five catalogs consistent. Never commit API keys, cookies, verification links, exports containing player information, or copied media without redistribution permission.

Your contribution must be something you are entitled to submit under this repository's MIT license. Identify third-party material and its license in THIRD_PARTY_NOTICES.md. No CLA is currently required.

Useful first contributions: test mobile microphone denial and recovery; improve natural Japanese or Portuguese translations; improve keyboard access; document reproducible mobile WebGL failures. Do not mark an issue as a confirmed bug until it is reproduced.

Treat contributors respectfully. Critique code and ideas, not people. Report security issues privately as described in SECURITY.md.
