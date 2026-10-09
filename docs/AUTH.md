# Authentication

The source defaults to `ACCOUNTS_ENABLED=false`: anonymous browser sessions and isolated saves, without registration. Set it to `true` for Google/verified-email access. Guest sessions never authorize admin access and are rejected when accounts are enabled. Anonymous mode still stores session identifiers and progress; it is not a no-data mode. See [deployment](DEPLOYMENT.md).

See [DEPLOYMENT.md](DEPLOYMENT.md) for provisioning. When accounts are enabled, gameplay requires a valid account session. Email users must follow a single-use verification link and set their password before playing; Google users use a verified OpenID Connect identity. Cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Session tokens are hashed in D1. OAuth checks state, browser binding and provider identity; account linking is explicit.

WeChat adapter code is retained but its login button is hidden. It is not advertised as a configured login method.

ADMIN_EMAIL controls the authorized verified Google identity. Unset means deny all administrator access. A matching display name or an email/password account with that string does not grant privileges. Configuration in /admin remains server protected.

Tests: tests/oauth.test.ts, tests/email-verification.test.ts, tests/admin.test.ts. Do not commit cookies, client secrets, verification links or database exports.
