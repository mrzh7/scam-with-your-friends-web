# Release acceptance

Use a clean Node.js 24 install: npm ci, npm run check. Unit/integration tests use mocked external providers and an in-memory SQLite database. A passing build is not a real-phone, email-delivery or paid-provider acceptance test.

Before a hosted launch, check:

- Google login with an ordinary account; email registration, expiry/resend and verified login.
- Anonymous and ordinary accounts cannot read /admin or its settings API; configured Google administrator can.
- Save/reload, concurrent-device conflict and recovery/export; no production data in test fixtures.
- AI replies directly in all supported languages; mute skips cloud speech; microphone denial leaves text usable.
- Two clients share a room and reconnect; cross-network voice works with the chosen TURN setup.
- Mobile WebGL failure/recovery and the final-minute countdown on target phones.
- Production bundle and tracked-file scan contain no provider secrets; no copied reference-media archive.

Specific results of the initial open-source preparation are recorded in RELEASE-CHECKS.md. Current source tests remain the authoritative automated checks, not earlier development-session logs.
