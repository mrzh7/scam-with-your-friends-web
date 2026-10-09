ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
CREATE TABLE email_verifications (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL UNIQUE,
 expires_at INTEGER NOT NULL,
 sent_at INTEGER NOT NULL
);
CREATE INDEX email_verifications_expiry ON email_verifications(expires_at);
-- Existing password accounts must prove ownership; keep their progress intact.
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email IS NOT NULL AND email_verified_at IS NULL);
