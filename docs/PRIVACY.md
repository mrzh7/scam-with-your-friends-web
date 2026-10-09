# Data flow for self-hosters

The source defaults to `ACCOUNTS_ENABLED=false`: anonymous browser sessions and isolated saves, without registration. Set it to `true` for Google/verified-email access. Guest sessions never authorize admin access and are rejected when accounts are enabled. Anonymous mode still stores session identifiers and progress; it is not a no-data mode. See [deployment](DEPLOYMENT.md).

This is an engineering description, not a ready-made legal privacy policy. Before publishing a hosted service, identify the actual operator, contact, retention periods, deletion process and jurisdictions.

| Data | Where it goes |
| --- | --- |
| Account email/name, verified identities | Your Worker/D1; Google during its login flow |
| Password | Sent over HTTPS to your Worker, stored as a salted hash |
| Sessions and verification tokens | Browser/Worker; hashed server records; verification link delivered through Resend |
| Game progress/settings | D1 and browser local storage for recovery |
| Typed AI conversation context | Your Worker and the configured dialogue provider |
| Generated speech text | Your Worker and chosen TTS provider when cloud playback is used |
| Microphone for speech recognition | Browser speech service; may be processed by its vendor, depending on implementation |
| Team voice | WebRTC peers, possibly relayed via configured TURN |
| Operational request metadata | Cloudflare and the services you configure, according to logging settings |

Do not invite players to share real card numbers, passwords or third-party personal information. Do not publish database dumps or raw provider request logs. The repository does not implement a full self-service account deletion or consent-management system; operators must supply a working process before claiming one.
