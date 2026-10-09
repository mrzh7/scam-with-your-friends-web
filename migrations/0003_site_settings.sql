ALTER TABLE auth_identities ADD COLUMN verified_email TEXT;
CREATE TABLE site_settings (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL);
