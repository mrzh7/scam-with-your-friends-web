<div align="center">

# Scam With Your Friends — Web

### ブラウザで遊べるオンライン協力プレイのコールセンター・パーティーゲーム · 仕事シミュレーター · ブラックコメディ

**架空の AI 発信者からの電話に出て、チームとボイスチャットで連携し、時間を管理して、1 日のノルマを達成し、人事評価を乗り切ろう。**

[English](README.md) · [简体中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · **日本語**

<p align="center">
  <a href="https://scam.gamefun.world"><strong>▶ デモをプレイ</strong></a>
  &nbsp;·&nbsp;
  <a href="#トレーラーを見る"><strong>トレーラー</strong></a>
  &nbsp;·&nbsp;
  <a href="#遊び方"><strong>ゲームプレイ</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/DEPLOYMENT.md"><strong>デプロイ</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/QUICKSTART.md"><strong>ドキュメント</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <a href="https://scam.gamefun.world"><img alt="Website" src="https://img.shields.io/badge/website-scam.gamefun.world-f3c848?labelColor=142e30" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white&labelColor=20232a" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-r180-000000?logo=threedotjs&logoColor=white" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" />
  <a href=".github/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white" /></a>
</p>

[![Scam With Your Friends — Web のゲームプレイプレビュー](docs/media/trailer-preview.gif)](https://scam.gamefun.world)

</div>

Scam With Your Friends — Web は、非公式の無料ブラウザーゲームであり、オープンソースプロジェクトです。混沌とした架空の**コールセンター**を舞台にした**オンライン協力プレイの仕事シミュレーター**で、自分のデスクまで歩き、話した内容に反応する **AI 発信者**(入力、またはブラウザーが対応していれば**音声操作**)に応対し、デスクトップのタスクを完了してゲーム内のお金を稼ぎます。**1 日のノルマ**がある**時間管理**ループで時計と競い、オフィスの事故をかわし、上司の**人事評価**に挑みます。最大 4 人の友達と遊べる**ブラックコメディのパーティーゲーム**です。すべて架空の内容です。実在の支払い情報は絶対に入力しないでください。

![Scam With Your Friends — Web の概要](docs/media/cover.svg)

## 遊ぶ理由

- **最大 4 人のオンライン協力プレイ** — 1 日とノルマを共有し、それぞれが自分の通話を担当。近接チームボイスにも対応。
- **AI 発信者** — 8 人の架空のキャラクター。オフラインのスクリプト返信はキー不要で動作し、自由な会話にはオプションの AI も使えます。
- **プレッシャーの中の時間管理** — 7 日間、上がり続ける 1 日のノルマ、アップグレードのあるショップ、受け取る配達物。
- **オフィスの大混乱** — ウイルス、停電、火災、摘発といった事故が日常を中断します。
- **ブラックコメディの雰囲気** — 不条理で架空のシナリオと容赦ない上司。実際の情報は一切収集しません。
- **インストール不要** — ブラウザーで動作。UI は 5 言語対応。Cloudflare の無料枠で自前ホスティングも試せます。

## トレーラーを見る

https://github.com/user-attachments/assets/4c90325b-0fb6-4102-877f-55c378ca5371

**[▶ 英語版 · 1080p 音声あり](docs/media/trailer-en.mp4)** · **[▶ 中国語字幕版](docs/media/trailer-zh-CN.mp4)** · [ポスター](docs/media/trailer-poster.jpg) · [オリジナルサウンドトラック](docs/media/trailer-score.mp3)

このプロジェクトのオフィス、キャラクター、ポートレートを使い、オリジナル音楽をつけたシネマティックなアニメーションです。セリフと動きはトレーラー用に演出されています。[絵コンテとレンダリング](marketing/trailer/README.md)。

**[ホスト版デモをプレイ → https://scam.gamefun.world](https://scam.gamefun.world)** — デモでは Google ログインまたは認証済みメールを使います。**ソースコードの既定ではアカウント機能は無効です**。

これは Steam の [Scam With Your Friends](https://store.steampowered.com/app/4954910/) に着想を得た、実験的な非公式プロジェクトです。原作そのものでも公式移植でもなく、原作の開発者とは一切関係ありません。[出典とライセンス](THIRD_PARTY_NOTICES.md)をご覧ください。タスク ID、カード、資金、イベントはすべて架空のものです。**実在の支払い情報は入力しないでください。**

## 遊び方

1. **デスクに座る** — WASD で移動、**E** で着席。モバイルでは画面上のコントローラーを使います。
2. **電話に出る** — AI 発信者を読み取り、信頼度と忍耐力を管理します。オフライン返信ボタン、またはオプションの AI 会話や音声を使えます。
3. **デスクトップのタスクを完了する** — 認証手順を終えてゲーム内のお金を稼ぎます(実際のカード情報は使わないでください)。
4. **買い物をして配達物を受け取る** — アップグレードはすぐにインストールされ、物理アイテムはオフィスで受け取る必要があります。
5. **シフトのタイマーが切れる前に 1 日のノルマを達成**して人事評価に合格しましょう。失敗するとそのランは終了です。協力プレイ: 最大 4 人で 1 日を共有し、**V** でチームボイス。

詳しいルール: [ゲームプレイガイド](docs/GAMEPLAY-JA.md) — ラウンドの流れ、操作、通話と信頼度、ツール、お金、ショップのアイテム、事故、協力ボイス、オーディオに関する注意。ほかの言語: [English](docs/GAMEPLAY-EN.md) · [简体中文](docs/GAMEPLAY.md) · [Português](docs/GAMEPLAY-PT.md) · [Español](docs/GAMEPLAY-ES.md)。

## スクリーンショット

[![スクリーンショットウォール: オフィス、通話デスク、メインメニュー](docs/media/screenshot-wall.png)](https://scam.gamefun.world)

| Three.js のオフィス | 着信デスク | メインメニュー |
| --- | --- | --- |
| 歩く、座る、買い物、配達物の受け取り | AI 発信者と話してタスクを完了 | ソロ、協力プレイのルームコード、設定 |

テスト用アカウントとオフライン会話を使い、この実装から撮影したもので、原作のゲーム映像ではありません。個別のスクリーンショット: [オフィス](docs/media/office.png)、[デスクトップ](docs/media/desktop.png)、[メニュー](docs/media/menu.png)。

## 機能

| システム | 実装 |
| --- | --- |
| オフィス | プロシージャル生成の Three.js ルーム、移動、インタラクション、機材、着席アニメーション |
| 通話 | 8 種類の AI 発信者プロフィール、信頼度/忍耐力、オフラインのスクリプト返信、オプションの AI 会話 |
| 勤務週 | 7 日間、1 日のノルマタイマー、ショップ、配達物の受け取り、インベントリ、事故、人事評価 |
| ボイス | 対応環境での音声認識による音声操作、チームボイスチャット、MiniMax または ElevenLabs によるオプションの TTS |
| 協力プレイ | 最大 4 人のオンライン協力プレイ、WebSocket による状態同期、共有の日/ノルマ、WebRTC ボイス |
| アカウント | 任意。既定では無効。Google、または Resend による認証済みメール/パスワード |
| セーブ | D1 のアカウントセーブ、リビジョン競合の検出、ローカルでの復旧/エクスポート |
| 言語 | 英語、中国語、ポルトガル語、日本語、スペイン語 |

## クイックスタート — アカウント不要

```sh
git clone https://github.com/mrzh7/scam-with-your-friends-web.git
cd scam-with-your-friends-web
npm ci
cp .dev.vars.example .dev.vars   # PowerShell: Copy-Item .dev.vars.example .dev.vars
npm run dev
```

**http://localhost:5173** を開きます。Cloudflare へのログイン、OAuth、メールサービスは不要です。AI キーを空にしておけば、スクリプト返信でオフラインプレイができます。

`.dev.vars` でのオプションの AI 設定:

```dotenv
ACCOUNTS_ENABLED=false
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
AI_API_KEY=your-own-provider-key
```

進行状況は匿名クッキーでブラウザーごとに保存されます。クッキーを消去する前にバックアップをエクスポートしてください。詳細: [ローカルガイド](docs/QUICKSTART.md)。

## Cloudflare へのデプロイ

ログインを使いたい場合は **`ACCOUNTS_ENABLED=true`** を設定し、自分の D1 データベースを作成して、少なくとも 1 つの認証方法を設定したうえで、**[DEPLOYMENT.md](docs/DEPLOYMENT.md)** に従ってください。Workers + Static Assets + D1 + Durable Objects を使い、静的専用の Pages アプリではありません。プロバイダーの認証情報は含まれておらず、ソースが無料でも有料 API は課金されることがあります。

## アーキテクチャ

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

`src/game/` — 共有ルール、会話、セーブ、ブラウザーのトランスポート。`worker/` — 認証、API、プロバイダー、ルームの権威サーバー。`migrations/` — D1 スキーマ。

## 開発

```sh
npm run check          # Public-tree checks, i18n, tests, TypeScript and production build
npm test
npm run check:i18n
```

[受け入れノート](docs/ACCEPTANCE.md)、[SECURITY.md](SECURITY.md)、[データフロー](docs/PRIVACY.md)を参照してください。既知の制限: モバイルでは WebGL と音声認識の挙動が異なります。決済システムはありません。クライアントから送信されるソロのセーブは、現実のお金に関わる報酬には適していません。

## コントリビューション

歓迎する分野: モバイル対応、自然な翻訳、アクセシビリティ、安定したボイス再接続。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。セキュリティ上の問題: [SECURITY.md](SECURITY.md)。

<div align="center">

### Star · シェア · コントリビュート

気に入ったら、**[リポジトリに Star](https://github.com/mrzh7/scam-with-your-friends-web)** を付け、友達と**[デモをプレイ](https://scam.gamefun.world)**して広めたり、issue や pull request を送ってください。

</div>

プロジェクト独自のコードは [MIT](LICENSE) です。第三者の名称、参照作品、依存ライブラリはそれぞれの権利を保持します — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
