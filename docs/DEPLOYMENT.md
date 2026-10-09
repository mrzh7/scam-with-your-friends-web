# Deploy your own instance / 自行部署

Use Node.js 24. All placeholders refer to **your** accounts. Do not point a fork or preview build at another operator's production database. The maintained online demo requires a real login; self-hosters configure their own credentials.

## 1. Cloudflare resources

```sh
npm ci
npx wrangler login
npx wrangler d1 create scam-with-your-friends-web-db
```

Copy the returned database_id into the DB entry in `wrangler.jsonc`, replacing the all-zero placeholder. Change the Worker name if necessary. Keep the DB and ROOMS binding names and OfficeRoom class name unchanged. The existing migrations configure SQLite-backed Durable Objects.

```sh
npm run db:local
npm run db:remote
npm run build
npx wrangler deploy
```

The first deployment exposes the app, but login needs step 2. Add your custom domain through Workers → Settings → Domains & Routes, or use your actual workers.dev hostname. Configure AUTH_ORIGIN to that single canonical HTTPS origin, without a trailing path.

## 2. Login and email

Set non-secret variables in your deployment's `wrangler.jsonc` vars or Worker settings; keep one source of truth and verify that a later deploy retains them. Use `wrangler secret put NAME` for credentials, which prompts without putting their value in shell history.

| Name | Type | Purpose |
| --- | --- | --- |
| AUTH_ORIGIN | Variable | e.g. https://game.example.com |
| GOOGLE_CLIENT_ID | Variable or secret | Your Web application OAuth client ID |
| GOOGLE_CLIENT_SECRET | Secret | Matching Google client secret |
| RESEND_API_KEY | Secret | Resend sending API key |
| EMAIL_FROM | Variable | Scam With Your Friends — Web <noreply@your-verified-domain> |
| ADMIN_EMAIL | Variable or secret | Your own Google-verified administrator email; absent means admin disabled |
| SITE_SETTINGS_KEY | Secret | 32 random bytes encoded as Base64, for encrypted settings |

Google Auth Platform: configure branding and audience, create a **Web application** client, add your HTTPS origin and this exact authorized redirect URI:

```text
https://game.example.com/api/auth/google/callback
```

Replace the example hostname. Request only the implemented scopes: openid, email, profile. Set the audience appropriate to your launch and complete Google's requested checks. A locally developed full Worker can use a separate development OAuth client and localhost callback; do not mix development and production credentials.

Resend: verify your sending domain, copy the exact DNS records the provider gives you, then set RESEND_API_KEY and EMAIL_FROM. Outgoing email needs sending verification; enabling inbound email is optional. Register, receive a one-time link, set a password and log in. Links expire after 24 hours; email text follows the language selected at registration. AUTH_ORIGIN must match the HTTPS origin sending the request; plain-HTTP local email registration is intentionally not supported. Use a separate HTTPS staging instance for end-to-end mail tests.

Generate the encryption key locally, then paste it into the prompted secret input:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
npx wrangler secret put SITE_SETTINGS_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
```

Preserve SITE_SETTINGS_KEY across deployments; replacing it without a planned migration makes existing encrypted provider settings unreadable. Never commit the generated value. Setting ADMIN_EMAIL alone is insufficient: sign in using that email's verified Google identity. There is no admin link in the game UI; open `/admin` directly. Server authorization protects both the page and its API.

## 3. Optional AI, TTS and team voice

| Feature | Configuration |
| --- | --- |
| Text dialogue | AI_BASE_URL, AI_MODEL, AI_API_KEY; compatible chat-completions provider |
| OpenRouter alternative | OPENROUTER_API_KEY plus AI_MODEL; default base is https://openrouter.ai/api/v1 |
| Cloud speech | TTS_PROVIDER, TTS_BASE_URL, TTS_MODEL, TTS_API_KEY, TTS_VOICE / TTS_VOICES |
| Team voice relay | TURN_KEY_ID and TURN_API_TOKEN for the Cloudflare relay adapter |

You may configure dialogue and speech in the authorized admin page after setting SITE_SETTINGS_KEY. Stored administrator settings override environment defaults. AI_API_KEY and TTS_API_KEY are different credentials even if both providers happen to be the same company. Never use VITE_ variables for provider secrets: those are exposed to browser bundles.

The DeepSeek-compatible base is typically `https://api.deepseek.com`; select a model your account can access. MiniMax uses a separate speech API and account key; choose an endpoint/model/voice supported by your provider account and region. Check each provider's current documentation before provisioning. With no AI credentials, the game uses offline scripted dialogue. Browser speech remains the fallback. Muting prevents normal frontend cloud TTS requests; server limits and provider billing caps are still necessary to limit deliberate abuse.

## 4. GitHub → automatic deployment

1. Fork or create a **separate deployment repository**, ideally private. Add your database binding and non-secret vars there. The public upstream keeps placeholder resource IDs.
2. In Cloudflare Workers & Pages, import that GitHub repository using **Workers** and grant access only to the intended repository.
3. Use production branch main, root directory /, Node 24, build command `npm run build`, deploy command `npm run deploy:ci`.
4. Ensure the build's deployment token can deploy this Worker and apply D1 migrations. Configure runtime secrets on the target Worker; build tokens and runtime secrets serve different purposes.
5. Do not automatically deploy untrusted pull requests with production bindings or secrets. Use a separate staging Worker/database for previews.
6. Push a harmless documentation change and verify that the Cloudflare deployment commit matches GitHub. Confirm `/api/health`, login, email verification, save/reload and a two-browser room.

CI in the public repository only checks/tests/builds; it does not deploy. It requires no production secrets. Deployments are driven by the separately configured Cloudflare Git integration.

## 5. Launch and recovery

Back up D1 before changing schema. A code rollback does not undo a schema migration. Keep old and new schema changes backward-compatible where possible. Check OAuth callbacks and mail domain verification after changing hostnames. Review provider budgets, privacy notices, account-data deletion process and monitoring before inviting users. See PRIVACY.md and SECURITY.md for current limitations.
