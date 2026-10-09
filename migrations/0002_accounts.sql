ALTER TABLE users ADD COLUMN profile_email TEXT;
ALTER TABLE saves ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE auth_identities (
  provider TEXT NOT NULL CHECK(provider IN ('google','wechat')),
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  union_id TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(provider, subject),
  UNIQUE(user_id, provider)
);
CREATE INDEX identities_user ON auth_identities(user_id);

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  binding_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  link_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  link_session_hash TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_expiry ON oauth_states(expires_at);

CREATE TABLE room_saves (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, room_code)
);
CREATE INDEX room_saves_recent ON room_saves(user_id, updated_at DESC);
