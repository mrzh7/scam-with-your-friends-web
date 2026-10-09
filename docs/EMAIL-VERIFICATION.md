# Email verification

Set RESEND_API_KEY, EMAIL_FROM and a canonical HTTPS AUTH_ORIGIN following [DEPLOYMENT.md](DEPLOYMENT.md). Verify the exact sending domain in Resend. Its key is separate from Google, dialogue and TTS credentials.

The UI sends the selected locale. The server supports en, zh, pt, ja and es for subject/body. The subject contains no desktop-brand suffix; the sender display name is controlled by EMAIL_FROM. The link is separated by blank lines, uses a fragment token, expires in 24 hours and is stored as a hash. Successful verification sets a user-chosen password and invalidates earlier sessions. Resending is rate-limited.

403 from Resend commonly means the sender domain or account permissions are not ready; inspect the provider dashboard without copying authorization headers or token-bearing message bodies into issues. Receipt depends on the recipient's mail system. Reply handling is separate: use an inbound provider or Cloudflare Email Routing if you want replies forwarded to a mailbox. Do not point the same hostname's MX records at competing inbox providers without understanding the routing.

Test real delivery only to a mailbox you control or whose owner has authorized the test. Automated tests use a mocked email provider.
