-- Migration: Add Team Gauntlet format
-- Fixed-partner Gauntlet (Pickleheads "Rumble" equivalent): teams keep partners,
-- get seeded by record each round, and winners draw harder opponents.

-- Separate migration (not an edit to 00004) so environments that already
-- applied 00004 still pick up the new enum value.
DO $$
BEGIN
    BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'team_gauntlet'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
