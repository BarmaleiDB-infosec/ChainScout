-- Create function to increment scans used
CREATE OR REPLACE FUNCTION public.increment_scans_used(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET scans_used = scans_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'active';
END;
$$;