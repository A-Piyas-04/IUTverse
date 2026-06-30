-- Refresh Supabase's REST schema cache after the additive V2 contract is present.
-- This prevents PGRST204/42703 errors for newly added columns and relationships.
notify pgrst, 'reload schema';
