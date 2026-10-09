# Architecture

The browser uses React/TypeScript for the desktop and accessible forms, Three.js for the procedural room and characters, and a shared game reducer for deterministic game actions. The source is bundled by Vite. Production requests are served on one origin by Cloudflare Workers with Static Assets.

D1 stores accounts, hashed sessions, OAuth identities/state, verification-token hashes, versioned saves, rate-limit counters and encrypted administrator configuration. Each co-op room is a SQLite-backed Durable Object that owns membership, shared clock/quota, per-player calls and WebSocket broadcasts. WebRTC carries team voice; a configurable TURN provider can relay traffic when direct peer connections fail.

The dialogue adapter sends a caller persona, attributed conversation history, current fictional task context and selected locale to an OpenAI-compatible chat-completions API. A response validator checks structure, game identifiers, revision and observed role-confusion patterns before changing state. A limited recovery retry handles recoverable upstream failures. This is not a proof that every model response is factual or in character.

The speech adapter supports MiniMax and ElevenLabs PCM streaming. Browser playback schedules audio and measures energy for approximate mouth motion. Browser-native speech is the fallback and uses estimated motion, not phoneme-level lip sync. Muting cancels playback and skips the frontend's normal cloud synthesis flow. Browser speech recognition is a separate capability; denial, network errors and timeouts should leave text entry available.

Worker authentication and administrator checks run server-side. Provider credentials stay in runtime secrets or encrypted D1 configuration, never in VITE_ variables. ADMIN_EMAIL selects a verified Google identity; an unset value denies administrator access. /admin has no in-game navigation link, but authorization—not obscurity—is its protection.

Account saves have revision checks and browser recovery copies. Single-player state originates on the client and is not suitable as a trusted monetary ledger. Co-op actions are evaluated by the room reducer. See SECURITY.md for operational limitations.

Source map: src/game (rules and transports), src/components (UI and office), src/i18n (locales), worker (server), migrations (D1 schema), tests (regressions). Full deployment and environment names are in DEPLOYMENT.md.
