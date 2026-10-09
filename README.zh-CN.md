# Scam With Your Friends — Web

**一个可以在浏览器里玩的办公室游戏：接听虚构来电，完成任务，和朋友一起赶在下班前达标。**

[English](README.md) · [完整玩法](docs/GAMEPLAY.md) · [部署指南](docs/DEPLOYMENT.md) · [参与贡献](CONTRIBUTING.md)

![项目概览](docs/media/cover.svg)

这是受《Scam With Your Friends》启发的非官方网页实验，不是原作，也不是官方移植。项目包含自行编写的游戏规则、程序化场景和七天关卡。原作截图、字幕、网页存档不随公开源码发布；公开可见不代表拥有再分发许可，见 [素材来源与许可证](THIRD_PARTY_NOTICES.md)。游戏里的卡片、任务编号和钱均为虚构，请勿输入真实支付资料。

## 在线试玩

试玩使用维护者的 Cloudflare 部署，发布前补上正式 URL。进入游戏需要 Google 登录或完成邮箱验证；请只使用游戏生成的虚构资料。线上配置可能与自行部署的版本不同。

## 本地开发与自行部署

需要 Node.js 24 和 npm：

```sh
git clone https://github.com/mrzh7/scam-with-your-friends-web.git
cd scam-with-your-friends-web
npm ci
npm test
npm run build
```

要运行完整服务，请按[部署指南](docs/DEPLOYMENT.md)配置自己的 Cloudflare 数据库和登录方式。本仓库不提供模拟账号或游客试玩；未配置大模型时，已登录玩家仍可使用离线剧情。

## 已有功能

- 办公室走动、入座、碰撞、道具互动和角色动画。
- 八个来电角色、信任与耐心、离线对话、可选大模型自由对话。
- 七天业绩目标、商店、配送、背包、事故、绩效考核与最后一分钟提醒。
- 1–4 人合作、WebSocket 同步、WebRTC 真人语音；可配置 TURN。
- 可选 MiniMax / ElevenLabs TTS；关闭声音时不调用云端 TTS。
- Google 登录、邮箱验证后设置密码、D1 持久化、存档冲突检测和本地恢复。
- 英语、中文、葡语、日语、西语，自动选择语言，也可手动切换。
- 管理员设置由服务器鉴权，AI 与 TTS 分开配置；普通用户不能查看密钥。

## 界面预览

![浏览器桌面与虚构来电](docs/media/desktop.png)

截图来自本仓库实现，使用虚构测试账号和离线对话；不是原作截图。

## 自行部署

采用 React + TypeScript + Vite + Three.js，后端是 Cloudflare Workers、D1 和 Durable Objects。**不能只上传静态文件到 Pages 就获得完整功能。**

[部署指南](docs/DEPLOYMENT.md) 包含创建数据库、迁移、Google 回调、邮件域名验证、AI/TTS 独立密钥、管理员设置及 GitHub 自动部署。上线需配置至少一种登录方法。公开源码不包含运营方数据库、用户信息、生产 ID 或服务凭据。微信入口隐藏，服务端适配代码保留供以后配置。

## 验证与限制

```sh
npm run check
```

检查源码发布规则、多语言、测试、类型与正式构建。自动测试使用模拟服务，不产生 AI 费用。手机 WebGL 和语音识别依赖浏览器与硬件，需要真机验收；多人语音跨网络可能需要 TURN。项目尚无支付系统，单人存档由客户端提交，不适合兑现奖励或作为可信竞技积分。

## 开源与参与

项目自有代码采用 [MIT](LICENSE)：允许修改、分发与商业使用，需保留许可证声明。第三方素材和商标不因 MIT 获得授权。运营网站产生的 Cloudflare、邮件、AI、TTS 费用由部署者承担。

欢迎改进手机体验、翻译、无障碍和语音稳定性。请看 [贡献说明](CONTRIBUTING.md)，安全问题请按 [SECURITY.md](SECURITY.md) 私下反馈。觉得有用可以点 Star；清楚的反馈和代码贡献同样重要。
