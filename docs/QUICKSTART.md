# Local quick start — no accounts required

[简体中文](QUICKSTART.zh-CN.md) · [Project home](../README.md) · [Cloudflare deployment](DEPLOYMENT.md)

For an immediate online demo, visit **https://scam.gamefun.world** (Google or verified email login required). Your own local installation defaults to no accounts.

## 1. Install and run

Install **Node.js 24** (includes npm) and Git. Check with `node --version`.

```sh
git clone https://github.com/mrzh7/scam-with-your-friends-web.git
cd scam-with-your-friends-web
npm ci
```

Copy `.dev.vars.example` to `.dev.vars`. On macOS/Linux:

```sh
cp .dev.vars.example .dev.vars
```

On Windows PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

If the file already exists, edit it instead of overwriting your credentials. For AI dialogue, configure:

```dotenv
ACCOUNTS_ENABLED=false
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
AI_API_KEY=your-own-provider-key
```

Use a model available to your provider account; see [DeepSeek's model updates](https://api-docs.deepseek.com/updates/). Leave the key empty to play with offline scripted dialogue.

```sh
npm run dev
```

Open **http://localhost:5173**. The startup script applies local database migrations automatically. No Cloudflare account, cloud database, Google OAuth client or email service is needed. Keep the placeholder cloud database ID for local development. Stop with Ctrl+C and restart after changing `.dev.vars`.

## 2. Configure text AI and optional speech

For a compatible Chat Completions provider, set `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` together. Use the API base URL, not a web chat URL, and do not append `/chat/completions`. For OpenRouter, use `https://openrouter.ai/api/v1` and a model identifier from its console.

Text AI and cloud TTS have **separate credentials**. Cloud speech is optional; browser speech is the fallback. For example, add to `.dev.vars`:

```dotenv
TTS_PROVIDER=minimax
TTS_BASE_URL=https://api.minimax.cn/v1
TTS_MODEL=speech-2.8-turbo
TTS_API_KEY=your-own-minimax-key
```

Choose the endpoint, model and voice supported by your provider account and region. `TTS_VOICE` sets the default voice; `TTS_VOICES` accepts a JSON array for the eight callers. Muting skips normal frontend cloud TTS requests. Microphone recognition depends on browser support and permission.

Keys stay on the server. Never use `VITE_` variables for secrets or commit `.dev.vars`. In no-account mode, configure providers through environment variables; the admin page is disabled.

## 3. Saves and co-op

Each browser receives a separate anonymous session cookie, valid for one year by default. Progress, coins, preferences and room data are stored separately for that identity. Clearing cookies, switching browsers or opening a private window creates a new identity. Export saves regularly from game settings.

Local D1 and Durable Object data lives in `.wrangler/state`; it does not access the maintained demo's database. Deleting this directory deletes local server data. Run `npm run db:local` to apply migrations manually. Keep using the same hostname instead of alternating between localhost and 127.0.0.1.

Different browsers connected to the same server can join a room. For other devices, microphone access and cross-network voice, use a properly configured HTTPS deployment. TURN relays team voice; it is not required for AI text dialogue.

## 4. Troubleshooting

- **Page does not open:** keep the development server running and use the address shown in its terminal. Free port 5173 or specify another port with `npm run dev -- --port 5182`.
- **Database/save error:** run `npm run db:local` from the project root, then restart.
- **AI unavailable:** check that the file is named `.dev.vars`, not `.dev.vars.txt`; verify the endpoint, key, model and provider balance, then restart. Never paste keys into issues.
- **Microphone does not respond:** use a supported browser, grant permission, and use HTTPS or localhost. Test text input first.
- **Need accounts/admin:** follow [the deployment guide](DEPLOYMENT.md). Setting `ACCOUNTS_ENABLED=true` requires configured login methods; guest progress is not automatically merged into registered accounts.

Reference: [Cloudflare local data and storage](https://developers.cloudflare.com/workers/local-development/local-data/).
