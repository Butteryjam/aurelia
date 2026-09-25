-- =============================================================================
-- RecipeVault — Migration 00006: Update Rate Limit Function Calculation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_action text,
  p_max_requests int,
  p_window_seconds int
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cutoff timestamptz;
  v_count int;
  v_oldest timestamptz;
  v_retry_after int := 0;
  v_remaining_seconds numeric;
BEGIN
  -- Strict authentication guard
  IF v_user_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', 60,
      'error', 'Unauthenticated'
    );
  END IF;

  -- Acquire an exclusive transaction-level advisory lock for this (user, action) pair.
  -- This serializes concurrent requests for the same user and operation.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_user_id::text),
    pg_catalog.hashtext(p_action)
  );

  v_cutoff := pg_catalog.now() - (p_window_seconds::text || ' seconds')::pg_catalog.interval;

  -- Count existing calls within the sliding window
  SELECT pg_catalog.count(*), pg_catalog.min(created_at)
  INTO v_count, v_oldest
  FROM public.ai_rate_limits
  WHERE user_id = v_user_id
    AND action = p_action
    AND created_at > v_cutoff;

  -- If limit exceeded, calculate exact remaining seconds until the oldest request expires
  IF v_count >= p_max_requests THEN
    v_remaining_seconds := pg_catalog.date_part(
      'epoch',
      (v_oldest + (p_window_seconds::text || ' seconds')::pg_catalog.interval - pg_catalog.now())
    );

    IF v_remaining_seconds < 1 THEN
      v_retry_after := 1;
    ELSE
      v_retry_after := pg_catalog.ceil(v_remaining_seconds)::int;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry_after
    );
  END IF;

  -- Insert current request record
  INSERT INTO public.ai_rate_limits (user_id, action, created_at)
  VALUES (v_user_id, p_action, pg_catalog.now());

  -- Housekeeping: purge records older than 2 hours for this user and action
  DELETE FROM public.ai_rate_limits
  WHERE user_id = v_user_id
    AND action = p_action
    AND created_at < (pg_catalog.now() - '2 hours'::pg_catalog.interval);

  RETURN pg_catalog.jsonb_build_object(
    'allowed', true,
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) TO authenticated;
