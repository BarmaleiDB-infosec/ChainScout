
-- ============================================
-- СОЗДАТЬ РАБОЧИЕ ТАБЛИЦЫ ДЛЯ CHAINSCOUT MVP
-- ============================================

-- Профили пользователей (нужны для OAuth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Сканирования
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('contract_address', 'solidity_code', 'github_repo')),
  target_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  risk_score INTEGER DEFAULT 0,
  vulnerabilities JSONB DEFAULT '[]',
  summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Отчёты
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  findings_count INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Профили
CREATE POLICY profiles_owner ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Сканы
CREATE POLICY scans_select ON public.scans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scans_insert ON public.scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY scans_update ON public.scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Отчёты
CREATE POLICY reports_select ON public.reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reports_insert ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ТРИГГЕР ДЛЯ СОЗДАНИЯ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
