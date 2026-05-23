-- AntoEcom Agents Community Platform — Schema

-- Profiles
CREATE TABLE community_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name VARCHAR(200),
  avatar_url TEXT,
  program VARCHAR(20) CHECK (program IN ('club', 'elite', 'trial')) DEFAULT 'trial',
  onboarded_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_profile" ON community_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON community_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON community_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- API Keys (encrypted at application layer)
CREATE TABLE user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'openrouter', 'shopify', 'dropi')),
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(20),
  is_valid BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  verification_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_keys" ON user_api_keys FOR ALL USING (auth.uid() = user_id);

-- Agent Catalog (admin-managed)
CREATE TABLE community_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('copy', 'ads', 'research', 'ugc', 'ecommerce', 'analytics', 'strategy')),
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  required_providers TEXT[] NOT NULL,
  default_model VARCHAR(80) NOT NULL,
  allowed_models TEXT[],
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  input_schema JSONB NOT NULL,
  output_format VARCHAR(20) DEFAULT 'markdown' CHECK (output_format IN ('markdown', 'json', 'chat', 'structured')),
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC DEFAULT 0.7,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_read_agents" ON community_agents FOR SELECT USING (true);

-- Agent Runs
CREATE TABLE agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  agent_id UUID REFERENCES community_agents(id) NOT NULL,
  agent_slug VARCHAR(60) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'cancelled')),
  input JSONB NOT NULL,
  output TEXT,
  output_metadata JSONB,
  model_used VARCHAR(80),
  provider_used VARCHAR(30),
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  cost_estimate_usd NUMERIC(10, 6),
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_slug, created_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_runs" ON agent_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_runs" ON agent_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Usage Aggregation
CREATE TABLE usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider VARCHAR(30) NOT NULL,
  total_runs INTEGER DEFAULT 0,
  total_tokens_input INTEGER DEFAULT 0,
  total_tokens_output INTEGER DEFAULT 0,
  total_cost_estimate_usd NUMERIC(10, 6) DEFAULT 0,
  UNIQUE(user_id, usage_date, provider)
);

ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_usage" ON usage_daily FOR SELECT USING (auth.uid() = user_id);

-- Saved Outputs
CREATE TABLE saved_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  run_id UUID REFERENCES agent_runs(id) NOT NULL,
  title VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_saved" ON saved_outputs FOR ALL USING (auth.uid() = user_id);

-- Rate Limits
CREATE TABLE rate_limit_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program VARCHAR(20) NOT NULL CHECK (program IN ('club', 'elite', 'trial')) UNIQUE,
  max_runs_per_day INTEGER NOT NULL DEFAULT 50,
  max_runs_per_hour INTEGER NOT NULL DEFAULT 20,
  max_tokens_per_day INTEGER NOT NULL DEFAULT 500000
);

INSERT INTO rate_limit_config (program, max_runs_per_day, max_runs_per_hour, max_tokens_per_day) VALUES
  ('trial', 10, 5, 50000),
  ('club', 50, 20, 500000),
  ('elite', 200, 50, 2000000);
