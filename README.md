# Scam With Your Friends — Web

**A browser office game where fictional callers, awkward conversations and a ticking quota collide.**

[简体中文](README.zh-CN.md) · [Gameplay](docs/GAMEPLAY-EN.md) · [Self-hosting](docs/DEPLOYMENT.md) · [Contributing](CONTRIBUTING.md)

![Scam With Your Friends — Web overview](docs/media/cover.svg)

Walk to your desk, answer calls, complete fictional verification tasks, buy equipment and survive a seven-day workweek. Play solo with offline dialogue or configure an AI provider for free-form conversations. Cloudflare Durable Objects coordinate rooms for up to four players.

This is an experimental, unofficial project inspired by [Scam With Your Friends](https://store.steampowered.com/app/4954910/). It is not the original game or an official port. See [provenance and licenses](THIRD_PARTY_NOTICES.md). All task IDs, cards, funds and events are fictional. Do not enter real payment details.

## Watch the trailer

https://github.com/user-attachments/assets/4c90325b-0fb6-4102-877f-55c378ca5371

**[▶ English · 1080p with sound](docs/media/trailer-en.mp4)** · **[▶ 中文字幕版](docs/media/trailer-zh-CN.mp4)** · [Poster](docs/media/trailer-poster.jpg) · [Original soundtrack](docs/media/trailer-score.mp3)

A cinematic animation made with this project's office, characters and portraits, with original music and sound effects. The dialogue and action are staged for the trailer. [Storyboard, sources and rendering instructions](marketing/trailer/README.md).

## Play online

**[Play the hosted demo → https://scam.gamefun.world](https://scam.gamefun.world)**

The maintained demo requires Google login or verified email. The source defaults to **no accounts required**; your own instance can use either mode.

## Quick local start — no accounts

Install Node.js 24 and Git, then:

```sh
git clone https://github.com/mrzh7/scam-with-your-friends-web.git
cd scam-with-your-friends-web
npm ci
cp .dev.vars.example .dev.vars
```

On Windows PowerShell, use `Copy-Item .dev.vars.example .dev.vars` instead of `cp`. If you already have `.dev.vars`, edit it rather than overwriting your keys.

For AI dialogue, edit `.dev.vars`:

```dotenv
ACCOUNTS_ENABLED=false
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
AI_API_KEY=your-own-provider-key
```

```sh
npm run dev
```

Open **http://localhost:5173**. Local database migrations run automatically. No Cloudflare login, OAuth setup or email service is needed. Leaving the AI key empty enables scripted offline play. Text AI and cloud speech use separate credentials; cloud TTS is optional.

Progress is isolated per browser using an anonymous cookie and a local simulated D1 database. Export backups before clearing cookies. See [the full local guide](docs/QUICKSTART.md) for storage, alternative providers and troubleshooting.

## Enable accounts and deploy

Set **`ACCOUNTS_ENABLED=true`** in your deployment's `wrangler.jsonc` vars, configure your own D1 database and at least one login method, then follow the [step-by-step Cloudflare guide](docs/DEPLOYMENT.md). Google, email, AI and TTS each have separate configuration. Guest progress is not automatically merged into registered accounts.

## What is implemented

| System | Implementation |
| --- | --- |
| Office | Procedural Three.js room, movement, interaction, equipment and seated character animation |
| Calls | Eight caller profiles, trust/patience, scripted offline responses, optional AI dialogue |
| Workweek | Seven days, timed quotas, shop, delivery collection, inventory, accidents and performance review |
| Voice | Speech recognition where supported, browser speech, optional MiniMax or ElevenLabs TTS; mute skips cloud TTS |
| Co-op | Up to four players, WebSocket state, shared day/quota and WebRTC voice; TURN configuration for reliable relay |
| Accounts | Optional; disabled by default. Google login or verified email/password via Resend; hidden WeChat UI with server adapter retained |
| Saves | D1 account saves, revision conflict detection and local recovery/export |
| Languages | English, Chinese, Portuguese, Japanese, Spanish; environment detection and manual override |
| Admin | Server-authorized provider configuration; administrator is a configured, verified Google identity |

## Screenshots

![Browser desktop with a fictional caller](docs/media/desktop.png)

Captured from this implementation using a synthetic test account and offline dialogue; this is not original-game footage.

## Full deployment

Use **Cloudflare Workers with Static Assets**, D1 and SQLite-backed Durable Objects. This is not a static-only Pages application.

1. Create your own D1 database and set its ID in `wrangler.jsonc`.
2. Choose account mode. When enabled, configure a canonical HTTPS origin and at least one login method.
3. Add server secrets for the providers you actually want to use.
4. Apply migrations and deploy. Connect a private deployment fork to Workers Builds for automatic releases.

Follow the exact commands and callback URLs in [DEPLOYMENT.md](docs/DEPLOYMENT.md). AI text, speech, email and Google OAuth have **separate credentials**. No provider credentials are included. Paid services may charge even when the source code is free.

## Architecture

```mermaid
flowchart LR
  UI[React desktop + Three.js office] --> Worker[Cloudflare Worker API]
  Worker --> D1[(D1 accounts and saves)]
  Worker --> DO[Durable Object room]
  DO <-->|WebSocket| UI
  Worker --> AI[Optional dialogue provider]
  Worker --> TTS[Optional speech provider]
  Worker --> Auth[Google / Resend]
  UI <-->|WebRTC| Peers[Other players]
```

`src/game/` contains shared game rules, dialogue contracts, saves and browser transports. `worker/` contains authentication, API endpoints, provider adapters and room authority. `migrations/` contains D1 schema changes. 

## Development and checks

```sh
npm run check          # Public-tree checks, i18n, tests, TypeScript and production build
npm test              # Unit and integration tests with mocked external providers
npm run check:i18n
```

Tests do not spend provider credits or prove compatibility with every phone. Test microphone permissions, WebGL recovery and cross-network co-op on real target devices before promising support. See [acceptance notes](docs/ACCEPTANCE.md).

Known limits: mobile WebGL/speech support varies; speech recognition may use browser-vendor services; no payment system is implemented; single-player saves are client-submitted and are unsuitable for real-money rewards. Provider rate limits are not hard spending caps. See [SECURITY.md](SECURITY.md) and [data flow](docs/PRIVACY.md).

## Contribute

Useful areas are mobile compatibility, natural translations, accessibility and reliable voice reconnection. See [CONTRIBUTING.md](CONTRIBUTING.md). If you find the project useful, a star helps other developers find it; reproducible bug reports and contributions are just as welcome.

Project-owned code is released under [MIT](LICENSE). Third-party names, reference works and dependencies retain their own rights and licenses.
