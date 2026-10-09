# Launch kit

These are drafts, not posts already published. Replace links if you rename the repository. Do not buy stars, use bots, mass-message people, or promise features you have not tested. Do not present this as the official original game.

## Repository metadata

- Name: scam-with-your-friends-web
- Description: Experimental browser office game with AI callers, co-op, voice and Cloudflare Workers. React + Three.js. Cloudflare-hosted demo.
- Topics: typescript, react, threejs, cloudflare-workers, durable-objects, web-game, ai-game, webrtc, text-to-speech, i18n
- Website: point to a maintained deployment only after smoke-testing that deployment; the maintained demo requires login.

## English short post

I open-sourced Scam With Your Friends — Web: a browser office game with fictional callers, a 3D office and a ticking daily quota. Try the maintained Cloudflare deployment (login required). Optional AI dialogue, TTS and four-player co-op run on Cloudflare Workers. Built with React, TypeScript and Three.js.

Code + setup: https://github.com/mrzh7/scam-with-your-friends-web

I'd especially like feedback on mobile voice reliability and the Portuguese/Japanese translations. This is an unofficial experimental project inspired by Scam With Your Friends, not an official port.

## 中文发布文案

我把一个浏览器办公室游戏 Scam With Your Friends — Web 开源了：可以走到工位接听虚构来电、完成任务、买道具，在倒计时前达到每日业绩。React + Three.js，后端用 Cloudflare Workers / D1 / Durable Objects。支持可选 AI 对话、TTS 和四人合作，提供英语、中文、葡语、日语、西语。

在线试玩使用维护者的 Cloudflare 部署，需要 Google 或已验证邮箱登录。手机语音兼容性仍需要更多真机反馈，欢迎反馈可复现问题，也欢迎改进翻译。项目受 Scam With Your Friends 启发，是非官方实验；不包含原作媒体素材。

源码：https://github.com/mrzh7/scam-with-your-friends-web

## Technical article / Show HN

Suggested title: Show HN: An open-source browser office game with optional AI callers

Lead with the working hosted demo and disclose the login requirement. Explain why DOM windows and a Three.js room share a reducer; why room clocks live in Durable Objects; why dialogue and TTS keys are separate; how mute avoids synthesis costs; how account-save revisions prevent silent overwrites. Include what failed on mobile and what remains untested. Disclose authorship and the original inspiration.

## 30–45 second recording script

0–6s: open the hosted demo, log in and enter the office.
6–12s: walk to the desk, sit, open Phone.
12–25s: show one fictional conversation and a completed verification task.
25–32s: collect a delivery or show the final-minute countdown.
32–40s: show a second language and the repository deployment guide.

Record this implementation only. Do not use original-game footage, real account pages, API settings or copyrighted background music. Label offline/demo dialogue accurately; only show AI/co-op footage if actually configured and tested.

## First two weeks

Day 1: publish a tested release with a short clip, source link and explicit limitations. Submit once to a relevant community that permits projects like this.
Days 2–4: answer questions, fix the first reproducible onboarding issues, and add a short troubleshooting note.
Days 5–7: publish one technical write-up about an actual implementation decision, not a repeat sales pitch.
Week 2: ship a small release responding to feedback and invite specific translation/mobile contributions.

Channels to consider: your own X account, relevant developer/game communities, Show HN, V2EX's applicable sharing area, and GitHub Discussions if enabled. Read each community's current self-promotion rules before posting. Success metrics: successful first sessions, useful issue reports, returning testers and contributions; stars are secondary and cannot be guaranteed.
