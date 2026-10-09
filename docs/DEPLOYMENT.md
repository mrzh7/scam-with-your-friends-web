# 完整部署步骤（中文）

本机免账户运行请先看[快速开始](QUICKSTART.md)。以下部署使用自己的 Cloudflare 资源，**不会连接或修改维护者的试玩站 https://scam.gamefun.world**。

## A. 开关与两种模式

| 设置 | 行为 |
| --- | --- |
| `ACCOUNTS_ENABLED=false`（默认） | 自动创建匿名浏览器会话，无注册登录。每个浏览器独立存档；管理员后台关闭 |
| `ACCOUNTS_ENABLED=true` | Google 或已验证邮箱登录后才能玩。进度绑定账号，管理员后台可配置 |

开关由服务端控制，不能用前端 URL 或本地存储绕过。本机写在 `.dev.vars`，云端写在部署仓库 `wrangler.jsonc` 的 `vars` 中。修改后本机重启，云端重新部署。缺省值为 false；拼错的非空值会按开启账户处理。

切换不会删除数据。匿名与账户 Cookie 独立，开启账户后旧匿名会话不能访问游戏接口。游客存档不会自动合并到注册账号，需要时先导出再导入。免账户公开部署会让访客使用你的 AI/TTS 额度；对外运营建议开启账户，并在服务商设置预算限制。

## B. 创建 Cloudflare 资源

先 Fork 项目，建议用独立的私有部署仓库保存自己的资源配置。安装 Node.js 24、Git 后执行：

```sh
npm ci
npx wrangler login
npx wrangler d1 create scam-with-your-friends-web-db
```

在 `wrangler.jsonc` 中：

1. `name` 改成你的 Worker 名称。
2. `d1_databases[0].database_id` 替换为刚返回的 ID，`database_name` 与实际数据库一致。
3. 保留 `DB`、`ROOMS` 绑定名、`OfficeRoom` 类名与已有 migrations。
4. 将 `vars` 配置为（域名换成自己的）：

```json
"vars": {
  "ACCOUNTS_ENABLED": "true",
  "AUTH_ORIGIN": "https://game.example.com",
  "AI_BASE_URL": "https://api.deepseek.com",
  "AI_MODEL": "deepseek-v4-flash"
}
```

如果没有自定义域名，先部署获得 workers.dev 地址，再将 AUTH_ORIGIN 改为该 HTTPS 地址并部署。第一次部署已要求登录，但登录入口要完成后面的凭据配置才能使用。

```sh
npm run deploy
```

这个命令依次构建、执行远程 D1 迁移并部署。手动等价步骤：`npm run build` → `npm run db:remote` → `npx wrangler deploy`。本机 `npm run dev` 只执行本机迁移，不会操作远程库。

绑定域名：Cloudflare → Workers & Pages → 你的 Worker → Settings → Domains & Routes → 添加 Custom Domain。等待 HTTPS 可用后，把 AUTH_ORIGIN 设成唯一正式入口（无路径、无尾斜杠），Google 回调也使用相同入口。

## C. Google 登录

1. 在 Google Cloud 创建/选择项目，打开 Google Auth Platform。
2. 配置 Branding（名称、支持邮箱、域名、首页及 Google 要求的政策页面）；Audience 按实际用户范围选择。正式对外服务切换正式发布状态。
3. Clients → Create client → **Web application**。
4. Authorized JavaScript origins 填 `https://game.example.com`。
5. Authorized redirect URIs 填 **`https://game.example.com/api/auth/google/callback`**，不要填首页。
6. 将 Client ID 写入 `wrangler.jsonc` vars 的 `GOOGLE_CLIENT_ID`。Client Secret 用交互式机密命令保存：

```sh
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

按提示粘贴对应 secret。代码使用 openid、email、profile；不要额外申请 Gmail/Drive 权限。按 Google 控制台提示完成实际需要的审核。配置后重新部署，在无痕窗口验证登录与保存进度。

## D. 邮箱注册和验证

Google 与邮箱可独立启用；至少配置一种才能在账户模式进入游戏。

1. 在 Resend 添加自己的发信域名，并按其控制台逐条添加 DNS。等待发信 DKIM/SPF 验证成功。
2. 创建 Sending 权限 API key；执行 `npx wrangler secret put RESEND_API_KEY` 并粘贴。
3. 在 vars 设置 `EMAIL_FROM`，例如 `Scam With Your Friends <noreply@mail.example.com>`，邮箱域名必须已在 Resend 验证。
4. AUTH_ORIGIN 必须是正确的正式 HTTPS 入口；重新部署。
5. 在网页提交邮箱注册 → 收到验证邮件 → 打开链接 → 设置密码 → 登录。链接有效期 24 小时，邮件跟随提交时的语言。

发送验证邮件不要求开启收信。若要接收玩家回复，另行配置对应域名 MX/邮件转发，避免与其他收信服务冲突。HTTP 本机邮件注册不受支持，真实收件验收请用独立 HTTPS 测试部署。

## E. AI、TTS、管理员与环境变量

以下配置均为 **Worker 服务端运行时配置**。普通变量写在自己的部署仓库 vars 中，避免只在控制台临时填写后被下一次部署覆盖。机密用 `npx wrangler secret put 名称`，不要写入源码、README、截图或 VITE_ 变量。

| 名称 | 保存方式 | 用途 |
| --- | --- | --- |
| ACCOUNTS_ENABLED | vars | 默认 false；开启账户用 true |
| AUTH_ORIGIN | vars | 账户站点唯一 HTTPS 地址 |
| GOOGLE_CLIENT_ID | vars | Google Web OAuth 客户端 ID |
| GOOGLE_CLIENT_SECRET | secret | 与 ID 对应的 Google 密钥 |
| RESEND_API_KEY | secret | 邮箱验证发信密钥 |
| EMAIL_FROM | vars | 已验证发信地址 |
| AI_BASE_URL / AI_MODEL | vars | 对话接口基础地址 / 模型 |
| AI_API_KEY | secret | 文字对话密钥 |
| OPENROUTER_API_KEY | secret，可选 | OpenRouter 替代；须同时使用相应 base/model，不要与其他服务商 key 混用 |
| TTS_PROVIDER | vars，可选 | minimax 或 elevenlabs；不配则浏览器语音 |
| TTS_BASE_URL / TTS_MODEL | vars，可选 | 对应 TTS 服务区域地址与模型 |
| TTS_API_KEY | secret，可选 | 云端合成语音密钥，与 AI key 分开 |
| TTS_VOICE / TTS_VOICES | vars，可选 | 默认音色 / 八角色音色 JSON 数组 |
| TURN_KEY_ID | vars 或 secret，可选 | Cloudflare TURN key 标识 |
| TURN_API_TOKEN | secret，可选 | 真人语音中继凭据 |
| ADMIN_EMAIL | vars 或 secret，可选 | 唯一管理员的 Google 已验证邮箱 |
| SITE_SETTINGS_KEY | secret，可选 | 管理员设置加密用的 32 字节 Base64 密钥 |
| WECHAT_APP_ID / WECHAT_APP_SECRET | vars / secret，可选 | 保留的适配器；微信登录按钮隐藏，初次部署无需填写 |

最小文字 AI 配置只需要 AI_BASE_URL、AI_MODEL、AI_API_KEY。例如执行 `npx wrangler secret put AI_API_KEY`。MiniMax TTS 另行填写 TTS 配置，不能只填写文字模型密钥就获得云端语音。完整示例见 `.dev.vars.example`（仅本机使用，部署不会上传该文件）。

管理员是可选功能：先设 ADMIN_EMAIL，再生成加密密钥：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
npx wrangler secret put SITE_SETTINGS_KEY
```

把生成结果粘贴到 secret 提示中，妥善备份，不提交。保持此值不变，否则以前保存的加密设置无法读取。用 ADMIN_EMAIL 对应的 **Google 登录**后访问 `/admin`；同名邮箱密码登录不授予管理员权限。页面没有菜单入口，后端同样验证权限。

账户开启时，后台保存的 AI/TTS 设置优先于环境变量；账户关闭时仅使用环境变量且拒绝访问后台。修改环境配置却没有变化时，检查是否存在管理员覆盖值。

## F. GitHub 提交后自动部署

1. 将自己的资源 ID、非机密 vars 提交到部署仓库；运行时 secrets 保留在 Cloudflare。
2. Cloudflare Workers & Pages → 创建/连接 Worker → 导入 GitHub 仓库。选择 **Workers**，不是静态 Pages。
3. 生产分支 `main`，根目录项目根，Node 版本 `24`。
4. Build command：`npm run build`；Deploy command：`npm run deploy:ci`。
5. 构建部署 token 需要该 Worker 的部署权限和 D1 迁移权限；它与 AI/邮件运行时密钥用途不同。
6. 提交一次改动，确认 Cloudflare deployment 的 commit 与 GitHub 一致。检查 `/api/health`、登录、刷新存档、邮件链接以及双浏览器房间。

仓库 GitHub Actions 只检查、测试和构建，不包含生产凭据；自动上线由你的 Cloudflare Git 集成负责。测试分支使用独立 Worker 和数据库，不要给不可信 PR 生产凭据。结构迁移前备份 D1；回滚代码不会撤销数据库迁移。

---

# Deploy your own instance / 自行部署

Use Node.js 24. All placeholders refer to **your** accounts. Do not point a fork or preview build at another operator's production database. The maintained [online demo](https://scam.gamefun.world) requires a real login. Source defaults to ACCOUNTS_ENABLED=false; use [QUICKSTART.md](QUICKSTART.md) for local play without accounts. The account-enabled instructions below require setting ACCOUNTS_ENABLED=true in wrangler.jsonc vars before deploying.

## 1. Cloudflare resources

```sh
npm ci
npx wrangler login
npx wrangler d1 create scam-with-your-friends-web-db
```

Set `vars.ACCOUNTS_ENABLED` to `"true"` in `wrangler.jsonc` to require accounts. Copy the returned database_id into the DB entry in `wrangler.jsonc`, replacing the all-zero placeholder. Change the Worker name if necessary. Keep the DB and ROOMS binding names and OfficeRoom class name unchanged. The existing migrations configure SQLite-backed Durable Objects.

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
| ACCOUNTS_ENABLED | Variable | false by default; true requires registered accounts |
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

You may configure dialogue and speech in the authorized admin page after setting SITE_SETTINGS_KEY. When accounts are enabled, stored administrator settings override environment defaults. When disabled, the admin page is inaccessible and provider configuration comes only from server environment variables. AI_API_KEY and TTS_API_KEY are different credentials even if both providers happen to be the same company. Never use VITE_ variables for provider secrets: those are exposed to browser bundles.

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
