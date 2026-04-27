-- Создаем таблицу для интеграций с Web3 сервисами
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'etherscan', 'infura', 'alchemy')),
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies для integrations
CREATE POLICY "Users can view their own integrations"
ON public.integrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
ON public.integrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.integrations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.integrations
FOR DELETE
USING (auth.uid() = user_id);

-- Функция для проверки лимитов сканирования
CREATE OR REPLACE FUNCTION public.can_user_create_scan(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    subscription_record RECORD;
    scans_today INTEGER;
    plan_limit INTEGER;
BEGIN
    -- Получаем подписку пользователя
    SELECT us.scans_used, sp.scan_limit, sp.name
    INTO subscription_record
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    LIMIT 1;
    
    -- Если подписка не найдена, запрещаем
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Если лимит не установлен (безлимит), разрешаем
    IF subscription_record.scan_limit IS NULL THEN
        RETURN true;
    END IF;
    
    -- Проверяем, не превышен ли лимит
    RETURN subscription_record.scans_used < subscription_record.scan_limit;
END;
$$;

-- Добавляем новые поля в scan_history для Web3
ALTER TABLE public.scan_history 
ADD COLUMN IF NOT EXISTS repository_url TEXT,
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS blockchain_network TEXT;