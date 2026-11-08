// Private server-side tables. No grants to Supabase's public API roles.
export const reviewSchema=`
 CREATE TABLE IF NOT EXISTS beverly_pizza.catalog (
  id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
 CREATE TABLE IF NOT EXISTS beverly_pizza.reviews (
  id UUID PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE, payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ, decision JSONB
 );
 CREATE INDEX IF NOT EXISTS reviews_status_created ON beverly_pizza.reviews(status,created_at DESC);
 ALTER TABLE beverly_pizza.catalog ENABLE ROW LEVEL SECURITY;
 ALTER TABLE beverly_pizza.reviews ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON beverly_pizza.catalog,beverly_pizza.reviews FROM PUBLIC,anon,authenticated;
`;
