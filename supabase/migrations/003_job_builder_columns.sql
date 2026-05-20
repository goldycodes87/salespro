ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS enabled_tier_ids text[],
  ADD COLUMN IF NOT EXISTS cash_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_id text,
  ADD COLUMN IF NOT EXISTS charged_amount numeric,
  ADD COLUMN IF NOT EXISTS rebate_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebate_tier_ids text[],
  ADD COLUMN IF NOT EXISTS calculator_result jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
