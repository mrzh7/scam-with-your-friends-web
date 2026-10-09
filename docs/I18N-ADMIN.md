# Languages and administrator settings

Locales: English (en), Chinese (zh), Portuguese (pt), Japanese (ja), Spanish (es). Environment detection supplies the initial locale; users can override it, and account saves retain their preference. Dialogue prompts request the selected language directly. TTS speaks the supplied reply in that language; language selection is not a Chinese-then-translate pipeline. Browser recognition uses the corresponding language tag, subject to browser support.

Administrator access is checked by the Worker on /admin and /api/admin/settings. ADMIN_EMAIL must match the session owner's verified Google identity. If it is missing, access is denied. Keep private credentials out of client code and do not rely on hiding URLs for authorization.

SITE_SETTINGS_KEY encrypts provider settings in D1 using AES-GCM. AI and speech have separate settings and keys. The settings page tests a provider before saving and avoids returning its key to the browser. These tests may incur a small provider charge. Existing stored settings take precedence over environment defaults.

Run npm run check:i18n and the admin/i18n/dialogue tests after changing these paths.
