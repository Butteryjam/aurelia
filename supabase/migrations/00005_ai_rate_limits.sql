-- =============================================================================
-- RecipeVault — Migration 00005: Concurrency-Safe AI Rate Limiting
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient window range lookups per user and action
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup
ON public.ai_rate_limits (user_id, action, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Authenticated users may view and insert only their own rate-limit rows
DROP POLICY IF EXISTS "Users can manage own rate limits" ON public.ai_rate_limits;
CREATE POLICY "Users can manage own rate limits"
ON public.ai_rate_limits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Minimum role privileges on table
GRANT SELECT, INSERT, DELETE ON public.ai_rate_limits TO authenticated;

-- ---------------------------------------------------------------------------
-- Atomic, Concurrency-Safe Rate Limiting Function
-- ---------------------------------------------------------------------------
-- Requirements:
--  - Concurrency safety: acquires an exclusive transaction-level advisory lock
--    keyed to the (user_id, action) tuple so concurrent calls cannot race.
--  - search_path = '': completely avoids search path hijacking attacks.
--  - Schema-qualified references for every catalog and table access.
--  - Identity derived solely from auth.uid().
--  - Execution restricted strictly to authenticated users (revoked from anon/public).
-- ---------------------------------------------------------------------------
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

-- Security hardening: revoke execution from public and anon; grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) TO authenticated;
