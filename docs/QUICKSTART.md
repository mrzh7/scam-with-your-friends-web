# 本机快速开始 / Local quick start

在线试玩：[https://scam.gamefun.world](https://scam.gamefun.world)。以下步骤用于在自己的电脑运行完整服务，无需注册 Cloudflare。

## 1. 安装与启动

安装 Node.js **24**（包含 npm）和 Git。用 `node --version` 确认版本。

```sh
git clone https://github.com/mrzh7/scam-with-your-friends-web.git
cd scam-with-your-friends-web
npm ci
```

复制 `.dev.vars.example` 为 `.dev.vars`：Windows PowerShell 用 `Copy-Item .dev.vars.example .dev.vars`，macOS/Linux 用 `cp .dev.vars.example .dev.vars`。已有文件不要覆盖。

```dotenv
ACCOUNTS_ENABLED=false
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
AI_API_KEY=填自己的密钥
```

模型必须是自己的服务商账户可用的模型。示例依据 [DeepSeek 官方模型说明](https://api-docs.deepseek.com/updates/)；模型可用性以服务商为准。也可暂时把 AI_API_KEY 留空，使用离线剧情。

```sh
npm run dev
```

访问终端显示的地址，默认 **http://localhost:5173**。首次启动自动应用所有本机数据库迁移；看到数据库迁移提示是正常的。无需手动创建云端数据库，也无需替换配置里的云端数据库占位 ID。

接听电话后可使用 AI 自由对话；未配置 AI 时使用离线剧情。配置改动后停止开发服务（Ctrl+C）并重新运行。浏览器里无法修改服务端密钥。

## 2. 更换 AI / 可选语音

兼容 Chat Completions 的服务需要同时配置 `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`。地址填 API 基础地址，不要填写网页聊天地址，也不要重复追加 `/chat/completions`。OpenRouter 可使用 `https://openrouter.ai/api/v1`，模型填写其控制台列出的 provider/model 标识。

文字 AI 与语音 TTS 独立。只配置 AI key 不会自动启用 MiniMax。可选在 `.dev.vars` 增加：

```dotenv
TTS_PROVIDER=minimax
TTS_BASE_URL=https://api.minimax.cn/v1
TTS_MODEL=speech-2.8-turbo
TTS_API_KEY=自己的MiniMax密钥
```

选择与你的 MiniMax 账户区域对应的接口、可用模型及音色。`TTS_VOICE` 设置默认音色，`TTS_VOICES` 为八个角色的音色 JSON 数组。未配置云端 TTS 时使用浏览器语音；语音识别取决于浏览器支持及麦克风权限。静音会跳过正常前端的云端 TTS 请求。不要把密钥写进 `VITE_` 变量或提交到 Git。

## 3. 存档与多人

免账户不等于多人共享存档：服务器创建匿名浏览器会话，保存金币、进度、设置和房间信息。Cookie 是识别该存档的凭据，默认有效期一年；清除 Cookie、使用隐私窗口或换浏览器会产生新身份。定期在游戏设置中导出存档。

本机 D1 / Durable Objects 数据在 `.wrangler/state`，不会写入维护者的线上数据库。删除该目录会删除本机服务器数据。`npm run db:local` 可手动补跑迁移。保持使用同一个 hostname，避免混用 localhost 与 127.0.0.1。

同一个服务器支持不同浏览器加入同一房间。跨机器访问、麦克风和跨网络语音需要正确的 HTTPS 网络部署；建议按部署指南部署独立实例。TURN 只影响真人语音中继，不是文字 AI 的必需配置。

## 4. 常见问题

- 页面无法打开：确认终端开发服务仍在运行；端口占用时按终端提示访问实际地址。
- 无法载入进度 / 数据库错误：在项目根目录运行 `npm run db:local`，再重启。
- AI 不可用：确认 `.dev.vars` 不叫 `.dev.vars.txt`，key、模型和地址属于同一服务商，账户有额度，修改后已重启。不要将密钥发到 issue。
- 手机语音无反应：需要受支持浏览器、HTTPS、麦克风授权；可先用文字输入验证 AI。
- 想配置后台：免账户模式不开放管理员页面，通过本机环境变量配置。启用账户后才可使用受保护的 `/admin`。

## English checklist

1. Install Node.js 24 and Git; clone the repo and run `npm ci`.
2. Copy `.dev.vars.example` to `.dev.vars`; keep `ACCOUNTS_ENABLED=false` and fill in your provider's `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`.
3. Run `npm run dev`, then open http://localhost:5173. Local migrations run automatically; no Cloudflare account is needed.
4. AI is optional. Cloud speech has separate TTS credentials. Restart the development server after changing configuration.
5. Saves belong to an anonymous browser cookie and the local `.wrangler/state` database. Export before clearing cookies; deleting local state deletes server saves.
6. For registered accounts or public hosting, follow [DEPLOYMENT.md](DEPLOYMENT.md).

Local emulation reference: [Cloudflare local data](https://developers.cloudflare.com/workers/local-development/local-data/).
