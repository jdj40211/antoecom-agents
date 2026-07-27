-- AntoEcom Agents — Schema inicial
--
-- Diferencias frente al schema.sql original:
--  * No existe la tabla community_agents. El catálogo de agentes vive en
--    lib/agents/catalog.ts. Tenerlo duplicado en la DB garantizaba que las dos
--    copias se desincronizaran (el seed tenía 20 agentes y modelos retirados,
--    el código tiene 28).
--  * agent_runs pierde el FK agent_id, que era NOT NULL y nunca se enviaba:
--    todo insert habría fallado.
--  * Trigger que crea community_profiles al registrarse un usuario.
--  * Función record_agent_usage para acumular usage_daily de forma atómica.
--  * ON DELETE CASCADE en todo lo que cuelga de auth.users.

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
CREATE TABLE community_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name VARCHAR(200),
  avatar_url TEXT,
  program VARCHAR(20) CHECK (program IN ('club', 'elite', 'trial')) DEFAULT 'trial',
  onboarded_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON community_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON community_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON community_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Crea el perfil automáticamente al registrarse. Sin esto ningún usuario
-- tendría fila en community_profiles y el rate limiting no sabría su programa.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- API keys del usuario (cifradas en la capa de aplicación con AES-256-GCM)
-- ---------------------------------------------------------------------------
CREATE TABLE user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(30) NOT NULL CHECK (
    provider IN ('anthropic', 'openai', 'google', 'openrouter', 'shopify', 'dropi')
  ),
  encrypted_key TEXT NOT NULL,
  key_hint VARCHAR(20),
  is_valid BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  verification_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Ejecuciones de agentes
-- ---------------------------------------------------------------------------
CREATE TABLE agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_slug VARCHAR(60) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'success', 'error', 'cancelled')
  ),
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

CREATE INDEX idx_agent_runs_user ON agent_runs (user_id, created_at DESC);
CREATE INDEX idx_agent_runs_agent ON agent_runs (agent_slug, created_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_runs" ON agent_runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_runs" ON agent_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- El stream actualiza la fila al terminar (status, output, tokens).
CREATE POLICY "users_update_own_runs" ON agent_runs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_runs" ON agent_runs
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Uso diario agregado
-- ---------------------------------------------------------------------------
CREATE TABLE usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider VARCHAR(30) NOT NULL,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_tokens_input INTEGER NOT NULL DEFAULT 0,
  total_tokens_output INTEGER NOT NULL DEFAULT 0,
  total_cost_estimate_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date, provider)
);

CREATE INDEX idx_usage_daily_user_date ON usage_daily (user_id, usage_date DESC);

ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_usage" ON usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- Acumula uso de forma atómica. Es SECURITY DEFINER porque usage_daily no
-- tiene policy de INSERT ni UPDATE: solo se escribe por esta vía, así que el
-- cliente no puede inflar sus contadores para saltarse el rate limit.
CREATE OR REPLACE FUNCTION public.record_agent_usage(
  p_provider VARCHAR,
  p_tokens_input INTEGER,
  p_tokens_output INTEGER,
  p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'record_agent_usage requiere un usuario autenticado';
  END IF;

  INSERT INTO usage_daily (
    user_id, usage_date, provider,
    total_runs, total_tokens_input, total_tokens_output, total_cost_estimate_usd
  )
  VALUES (
    v_user_id, CURRENT_DATE, p_provider,
    1, COALESCE(p_tokens_input, 0), COALESCE(p_tokens_output, 0), COALESCE(p_cost, 0)
  )
  ON CONFLICT (user_id, usage_date, provider) DO UPDATE SET
    total_runs = usage_daily.total_runs + 1,
    total_tokens_input = usage_daily.total_tokens_input + COALESCE(p_tokens_input, 0),
    total_tokens_output = usage_daily.total_tokens_output + COALESCE(p_tokens_output, 0),
    total_cost_estimate_usd = usage_daily.total_cost_estimate_usd + COALESCE(p_cost, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- Outputs guardados
-- ---------------------------------------------------------------------------
CREATE TABLE saved_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, run_id)
);

CREATE INDEX idx_saved_outputs_user ON saved_outputs (user_id, created_at DESC);

ALTER TABLE saved_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_saved" ON saved_outputs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Límites por programa
-- ---------------------------------------------------------------------------
CREATE TABLE rate_limit_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program VARCHAR(20) NOT NULL UNIQUE CHECK (program IN ('club', 'elite', 'trial')),
  max_runs_per_day INTEGER NOT NULL DEFAULT 50,
  max_runs_per_hour INTEGER NOT NULL DEFAULT 20,
  max_tokens_per_day INTEGER NOT NULL DEFAULT 500000
);

ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Los límites no son secretos y la app los muestra al usuario.
CREATE POLICY "authenticated_read_limits" ON rate_limit_config
  FOR SELECT TO authenticated USING (true);

INSERT INTO rate_limit_config (program, max_runs_per_day, max_runs_per_hour, max_tokens_per_day)
VALUES
  ('trial', 10, 5, 50000),
  ('club', 50, 20, 500000),
  ('elite', 200, 50, 2000000);
