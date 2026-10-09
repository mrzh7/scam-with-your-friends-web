# Open-source preparation checks

Date: 2026-10-09. Environment: Windows, Node.js 24.12.0. These results are scoped to this source export, not a full security audit of the maintained deployment.

- Fresh npm ci in a separate directory completed. npm audit fix updated the affected Cloudflare/Miniflare/sharp development chain; npm rebuild succeeded.
- npm run check passed: tracked-file heuristic secret/exclusion checks, i18n manifest, 12 test files / 209 tests, TypeScript and production build.
- npm audit after the update reported zero known vulnerabilities across runtime and development dependencies at the time of the check. This changes as advisories are published.
- The private source repository's 200 locally reachable historical blobs were searched by credential patterns and compared against locally configured secret values. No matches. Unreachable Git objects, remote caches, Actions/Cloudflare/provider logs and previously shared screenshots were outside scope.
- New repository starts from a clean initial history, excludes original-game screenshots/transcripts/HTML archives, attachments, credentials, databases, runtime logs, node_modules and builds.
- Runtime administrator email is configurable and fails closed when absent; two regression tests cover the absent configuration.
- The public tree contains no added guest/local-demo authentication path. Production login remains mandatory.
- A temporary browser test used a synthetic account to exercise the real menu, office movement, sitting, answering a call and the agent camera. No page errors were observed. Screenshots in docs/media were visually inspected. This test does not bypass production login or ship a demo API.
- Build warnings: the Three.js chunk slightly exceeds Vite's 500 kB advisory; this is a size warning, not a failed build. Node prints its experimental SQLite warning in tests.

Provider requests are mocked in automated tests. Real microphone support, real email delivery, live AI/TTS, cross-network co-op and the user-supplied hosted demo still need environment-specific acceptance. Do not interpret this report as a guarantee of universal compatibility or asset-rights clearance.
