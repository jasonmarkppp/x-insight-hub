-- ============================================================================
-- X Insight Hub - Database Schema
-- ============================================================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Authors (Monitored X/Twitter accounts)
-- ============================================================================
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitter_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  tier VARCHAR(10) NOT NULL DEFAULT 'A' CHECK (tier IN ('S', 'A', 'B')),
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authors_active ON authors (active);
CREATE INDEX idx_authors_username ON authors (username);
CREATE INDEX idx_authors_tier_fetch ON authors (tier, last_fetched_at)
  WHERE active = TRUE;

-- ============================================================================
-- Tweets
-- ============================================================================
CREATE TABLE tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT NOT NULL UNIQUE,
  author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  raw_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  pushed_to_feishu BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_tweets_tweet_id ON tweets (tweet_id);
CREATE INDEX idx_tweets_author_id ON tweets (author_id);
CREATE INDEX idx_tweets_created_at ON tweets (created_at DESC);
CREATE INDEX idx_tweets_processed ON tweets (processed) WHERE processed = FALSE;

-- ============================================================================
-- Tweet Analysis (DeepSeek results)
-- ============================================================================
CREATE TABLE tweet_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  translation TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  category TEXT DEFAULT '',
  sentiment TEXT DEFAULT 'Neutral' CHECK (sentiment IN ('Bullish', 'Bearish', 'Neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tweet_analysis_tweet_id ON tweet_analysis (tweet_id);
CREATE INDEX idx_tweet_analysis_category ON tweet_analysis (category);
CREATE INDEX idx_tweet_analysis_sentiment ON tweet_analysis (sentiment);

-- ============================================================================
-- Content Generation (AI Factory outputs)
-- ============================================================================
CREATE TABLE content_generation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  x_version TEXT DEFAULT '',
  wechat_version TEXT DEFAULT '',
  xiaohongshu_title TEXT DEFAULT '',
  xiaohongshu_content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_generation_tweet_id ON content_generation (tweet_id);
CREATE INDEX idx_content_generation_created_at ON content_generation (created_at DESC);

-- ============================================================================
-- Settings (Runtime configuration for API keys, editable via UI)
-- ============================================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a default settings row
INSERT INTO settings (id, config) VALUES (
  gen_random_uuid(),
  '{
    "supabase_url": "",
    "supabase_anon_key": "",
    "supabase_service_role_key": "",
    "twitter_bearer_token": "",
    "deepseek_api_key": "",
    "feishu_webhook_url": "",
    "cron_secret": ""
  }'::jsonb
);

-- ============================================================================
-- Auto-update updated_at trigger for authors
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_authors_updated_at
  BEFORE UPDATE ON authors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
