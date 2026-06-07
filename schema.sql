CREATE TABLE IF NOT EXISTS eligible_tokens (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
  token_hash TEXT PRIMARY KEY REFERENCES eligible_tokens(token_hash),
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claim_code TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claims_claimed_at ON claims(claimed_at);
