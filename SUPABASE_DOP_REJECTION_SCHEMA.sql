-- =============================================
-- DOP LEARNING SCHEMA UPDATES
-- Add rejection tracking columns
-- =============================================

-- 1. Add rejection columns to dop_prompt_records
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS was_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] DEFAULT '{}';
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE dop_prompt_records ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 2. Add failure tracking to dop_model_learnings
ALTER TABLE dop_model_learnings ADD COLUMN IF NOT EXISTS failure_patterns JSONB DEFAULT '{}';
ALTER TABLE dop_model_learnings ADD COLUMN IF NOT EXISTS rejection_counts JSONB DEFAULT '{}';

-- 3. Create index for rejection analysis
CREATE INDEX IF NOT EXISTS idx_dop_records_rejected ON dop_prompt_records(was_rejected);
CREATE INDEX IF NOT EXISTS idx_dop_records_rejection_reasons ON dop_prompt_records USING GIN(rejection_reasons);

-- 4. View for rejection analysis
CREATE OR REPLACE VIEW dop_rejection_analysis AS
SELECT 
    model_type,
    COUNT(*) FILTER (WHERE was_rejected = true) as rejection_count,
    COUNT(*) FILTER (WHERE was_approved = true) as approval_count,
    COUNT(*) as total_count,
    ROUND(
        COUNT(*) FILTER (WHERE was_rejected = true)::numeric / 
        NULLIF(COUNT(*)::numeric, 0) * 100, 
        2
    ) as rejection_rate
FROM dop_prompt_records
GROUP BY model_type
ORDER BY rejection_count DESC;

-- Done!
SELECT 'DOP rejection columns added successfully!' AS status;
