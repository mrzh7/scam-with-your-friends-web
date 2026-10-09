# Gameplay guide and system design · v0.2

**English** · [简体中文](GAMEPLAY.md) · [Português](GAMEPLAY-PT.md) · [Español](GAMEPLAY-ES.md) · [日本語](GAMEPLAY-JA.md)

This is the English guide to the rules implemented in this repository: an online co-op call center job simulator and dark comedy party game with fictional AI callers, time management, a daily quota and a performance review. Public information about the original game confirms the main loop (AI callers, a windowed computer, a co-op office, daily quota, shop, accidents and reviews). The seven-day curve, delivery times, upgrade effects, map scale and physics parameters below are this web version's own design, **not hidden rules of the original game**. See the [research notes](RESEARCH.md). The in-game Handbook and the "How to play" button show the same material.

> Unofficial fan project. All callers, cards, task IDs and money are fictional. Never enter real payment details.

## How a run works

1. Start the shift and find the yellow-marked personal desk in the office. Walk close and press **E** to sit.
2. Answer an incoming call in Phone, read the caller's personality, talk, and obtain a fictional task token.
3. Open the matching business app to verify it. Money is earned only when the task is completed; getting the caller to read out a code pays nothing.
4. Buy software, gear or supplies as needed. Software installs at once; physical items arrive at the delivery area, so you must leave your desk to collect them and then use them from your backpack.
5. When an accident happens, task verification pauses until you fix it. A power outage means walking to the electrical panel in the break room.
6. Once the daily quota is reached you may request the performance review early; the countdown also triggers it automatically. Passing moves you to the next day; missing the quota ends the run.
7. There are seven days. Passing the final review unlocks "Weekend Survivor". You can be rehired for a fresh run.

## The office and controls

The map has a desk area, a right-hand corridor, a break room and a review meeting room. The delivery area is behind and to the right of the desk area; the electrical panel is to the right of the break room. Four players each have one desk, and nobody can sit remotely or at another player's computer. The first two rows are ambient coworkers.

| Action | Key / method |
| --- | --- |
| Move, strafe | WASD; up/down arrows move forward and back |
| Look around | Hold and drag the mouse, or click "Lock / Release mouse"; left/right arrows turn |
| Run / jump | Shift / Space |
| Switch first / third person | C |
| Sit, pick up, unpack, reset the electrical panel | Stand near the target and press E |
| Leave seat / sit again | Tab; sitting still requires being near your own desk |
| Drop / throw held item | Q / left mouse button |
| Wave / take a photo | J / P; the Camera app can also take and download photos |
| Backpack / How to play / Menu | I / H / Esc in the office |
| Team voice | After enabling voice, hold V, or hold the on-screen talk button |

Narrow screens get on-screen direction buttons. Movement is blocked by walls and furniture; diagonal movement has no speed bonus. Running and jumping cost stamina, which recovers when you stop running. Short taps move you in small steps.

Characters have walking arm swing, sitting and typing poses, blinking, lip movement while speaking, waving and hit reactions. The office Camera sits above your desk monitor, faces the seat and shows people in the same world; it stays behind when you leave. Human voice volume drives avatar mouth movement; text replies trigger short speaking gestures. NPC call windows use bold 2D animated portraits to distinguish them from 3D employees, with subtitles or synthesized voice driving the mouth. This is not precise phoneme-level facial capture.

## Calls, trust and business tools

A call rings for 25 seconds; missing it counts as a failure. After answering, base patience is `max(45, 115 − day×3 − floor(risk/4))` seconds, plus 30 seconds with the coffee machine. An active accident drains an extra 1 second of patience per second. The caller hangs up when patience runs out or trust reaches zero.

Offline mode offers three preset replies (patient, professional, humorous); free text and voice need AI enabled. New call openings are generated from the current business, so a card-verification call no longer opens with the corn ledger. A good reply adds 16 trust; a poor reply removes 18; the Golden Script Book adds 5 to good replies. After three positive exchanges with trust at least 55, the caller gives the task token.

With AI configured, free text or recognized speech goes through the server to a real model. The model returns dialogue and a positive / neutral / negative judgement based on the persona, history and your reply. A state machine decides trust and verification; the model cannot change the wallet, quota progress or items. Neutral answers do not advance the task, and stale answers never affect a later call. Service failures show the reason and you can switch back to offline mode.

| App | Unlocks | Base income | Completion condition |
| --- | --- | --- | --- |
| Identity | Day 1 | $250 | Submit the GAME-ID token revealed in the call |
| Credit Card | Day 1 | $400 | Verify the GAME-CARD, PIX and MOON tokens in order |
| AnyViewer | Day 2 | $400 | Connect the simulated PC, pick mission.txt and verify the task code |
| Gift Cards | Day 2 | $350 | Submit the GAME-GC game gift token |
| Charity | Day 3 | $500 | Finish the Moon Cat Fund game task |
| Corn Futures | Day 4 | $650 | Finish the corn futures game task |
| Nobel Prize | Day 5 | $800 | Finish the Slacker Prize game task |
| Retirement Fund | Day 6 | $1,000 | Finish the Mars Retirement Plan game task |

A wrong code lowers trust, and one task can never be settled twice. Every business is a local fictional simulation: no real payments, no real financial data collection and no real remote access.

Caller Records opens on day 3 with the preferences and run history of eight characters: retired teacher Dorothy, astronaut Miles, actress Shanice, accountant Franklin, creator Brittany, gardener Eleanor, programmer Damien and pet shop owner Oliver.

## Money and growth

You start with an $80 wallet, one energy drink and one repair kit. Completing a task adds to the wallet, today's personal quota and lifetime business income. The team's daily quota is the sum of all players' personal totals.

Shopping only reduces the wallet and never subtracts from completed quota. Rainbit entertainment wins and losses change only the wallet, not quota or lifetime income; it is a simplified side game using tokens with no real-world value. Moving to the next day keeps the wallet, inventory, gear, orders and lifetime income, and resets the daily quota.

Finance keeps the latest 60 transactions with balances and dates. Five achievements cover the first deal, three deals in a row, the first purchase, clearing an accident and passing day 7; achievements never grant hidden currency. A failure breaks the streak and adds 5 risk (cap 100). Risk drops by 15 on the next day and by 10 when an accident is resolved.

## Shop, delivery and items

Scamazon groups goods by type. Software installs after payment; physical goods reach the delivery area after 5 game seconds. Stand next to your own package and press E to unpack, then use the item from Inventory. In co-op, orders belong to the buyer and nobody else can collect them. You can hold up to eight orders and 99 of each item. Permanent upgrades cannot be bought twice; consumables can be restocked.

| Item | Price | How you get it | Effect |
| --- | --- | --- | --- |
| Noise-cancelling headset | $200 | Physical → install | +10 starting trust on later calls |
| Malwarebits Pro | $350 | Software, instant | Automatically blocks virus accidents |
| Perpetual coffee machine | $450 | Physical → install | +30 seconds of patience when answering |
| Golden Script Book | $600 | Software, instant | +5 trust on positive exchanges |
| Performance amplifier | $900 | Software, instant | ×1.2 income per task, for wallet and quota |
| Emotional support plant | $120 | Physical → install | Instantly −15 risk, then −2 per completed task |
| Customer-support riot shield | $120 | Physical → equip | Blocks the next raid, then is consumed; re-buy to re-equip |
| Confetti air raid | $6,000 | Physical → use | Knocks nearby loose items away, unbalances nearby players for 2 s, confetti lasts 5 s |
| Energy drink | $60 | Physical → use | Stamina to 100, +25 s patience on an active call (cap 180); one bottle consumed |
| Power repair kit | $90 | Physical → use | Near the panel, instantly fixes an outage; not consumed if no outage or wrong place |
| Extinguisher refill | $180 | Physical → use | Instantly puts out a fire; not consumed if there is no fire |
| Office basketball | $45 | Physical → use | Spawns a shared basketball you can pick up, throw and bounce; stays in inventory if the world item cap is reached |

Balls, boxes and cups on the floor can be picked up, carried, dropped or thrown. They react to gravity, ground bounce, friction, horizontal wall and furniture collision and each other. A fast object can briefly unbalance a player. Collision shapes are simplified and are not the original game's ragdoll physics or exact mesh collision. Photos are currently downloadable PNGs, not throwable printed photos.

## The seven days and accidents

| Day | Quota | Time | New business / content | Accident |
| --- | --- | --- | --- | --- |
| 1 | $600 | 6 min | Identity file, three-field card verification | None |
| 2 | $1,100 | 6 min | Remote desktop, gift cards | Virus |
| 3 | $1,750 | 6 min | Moon Cat Fund, customer records | Power outage |
| 4 | $2,200 | 6 min | Corn futures | Fire |
| 5 | $2,600 | 6 min | Slacker Prize | Raid |
| 6 | $3,200 | 6 min | Mars Retirement Plan | Power outage |
| 7 | $4,000 | 7 min | Final review across every business | Raid |

An accident fires once when less than 62% of the workday remains. A virus is cleaned in three steps in Malwarebits. A power outage means leaving your seat for the electrical panel and pressing E three times, or using a repair kit. A fire can be put out instantly with an extinguisher or handled in the Security Center. For a raid, equip the riot shield beforehand or finish a three-step cleanup in the Security Center. Accidents only pause task progress; the workday clock keeps running.

The review shows the team total, personal contributions, a pass / fired result and real call snippets from the run. The replay is synthesized speech reading saved text; real human voice is neither stored nor replayed.

## Co-op, voice and progress

One to four players join with a room code. The host starts, requests an early review and advances the day; each member answers their own calls and manages their own wallet and backpack. The server computes movement, collision, items, timers and rewards and broadcasts them; clients send direction input only and never upload trusted coordinates or income.

Human voice is real WebRTC audio and asks for microphone permission before joining. Push-to-talk on V is the default, with an open-mic option. Volume falls with distance by default and distance volume can be turned off. Voice signaling is relayed only between online members of the same room who enabled voice. Leaving the room or disconnecting closes tracks and connections. Without TURN, direct STUN is used and some networks cannot connect; with Cloudflare TURN configured, short-lived relay credentials are issued.

## Audio and speech notes

Sound is off at first; enable it in the tray to hear callers. While muted, normal playback does not request cloud text-to-speech. NPC voice input relies on the browser's SpeechRecognition and synthesized speech relies on system voices. Recognized text is placed in the text box by default and can optionally be sent as soon as it is recognized. Browsers without speech recognition can still be played with text. This is not the original game's local STT/TTS or voice cloning.

Single-player progress, inventory, orders and achievements autosave locally and can be exported as JSON. Accounts support registration, login and manual save / load to D1 cloud saves, with version-conflict checks when saving from different devices. Reloading in single player re-places the character and temporary floor items and regenerates packages for open orders. The multiplayer world is persisted periodically by a Durable Object and rejoining the same room restores server state; it is independent of single-player saves.

Single player pauses in menus, dialogs and hidden tabs; multiplayer pauses only when everyone is offline. If the host disconnects, hosting passes to an online member. A started room accepts no new members, but existing members can reconnect.

## Where it is implemented

- `src/game/engine.ts`: calls, economy, accidents, orders, inventory, achievements, save validation.
- `src/game/world.ts`: walkable map, desks, objects, pickup, throwing, collision, delivery and item use.
- `src/components/Office.tsx`, `avatar.ts`, `CallerPortrait.tsx`: world, skeletal motion, NPC expressions.
- `worker/dialogue.ts`, `useDialogue.ts`: real server-side AI calls and stale-result protection.
- `rtcPeer.ts`, `useVoice.ts`, `worker/rtc.ts`: WebRTC audio, push-to-talk, volume, TURN credentials.
- `worker/room.ts`: authoritative room state, shared quota, physics snapshots, voice signaling.
- [Acceptance notes](ACCEPTANCE.md) separate automated tests, real-browser checks and items that need real service credentials.
