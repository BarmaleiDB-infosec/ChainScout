-- Таблица сканирований
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Включить RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Users can view own scans"
ON public.scans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create scans"
ON public.scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
ON public.scans FOR UPDATE
USING (auth.uid() = user_id);