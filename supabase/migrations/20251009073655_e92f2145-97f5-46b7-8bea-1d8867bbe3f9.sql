-- Создаем таблицу для шаблонов сканирования
CREATE TABLE IF NOT EXISTS public.scan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('github_repo', 'smart_contract', 'web_app', 'api')),
  configuration JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies для scan_templates
CREATE POLICY "Users can view their own templates"
ON public.scan_templates
FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own templates"
ON public.scan_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.scan_templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.scan_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Добавляем поле template_id в scan_history
ALTER TABLE public.scan_history 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.scan_templates(id) ON DELETE SET NULL;

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_scan_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_scan_templates_updated_at
BEFORE UPDATE ON public.scan_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_scan_templates_updated_at();