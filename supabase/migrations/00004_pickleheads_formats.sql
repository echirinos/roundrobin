-- Migration: Add Pickleheads/Swish Tournament Formats
-- Adds 13 new tournament formats (9 rotating partner + 4 fixed partner)

-- Note: This migration assumes the base schema already exists.
-- If starting fresh, you'll need to create the base tournament tables first.

-- ============================================
-- ENUM EXTENSIONS
-- ============================================

-- Create event_format enum if it doesn't exist, or add new values
DO $$
BEGIN
    -- Create the enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_format') THEN
        CREATE TYPE event_format AS ENUM (
            -- Traditional formats (existing)
            'single_elimination',
            'double_elimination',
            'round_robin',
            'swiss',
            'pool_play',
            'gauntlet',
            -- New rotating partner formats
            'popcorn',
            'up_down_river',
            'king_of_court',
            'claim_throne',
            'cream_crop',
            'double_header',
            'mixed_madness',
            'scramble',
            -- New fixed partner formats
            'shuffle',
            'bracket',
            'milp'
        );
    ELSE
        -- Add new values to existing enum (PostgreSQL 9.1+)
        -- These will silently fail if they already exist
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'popcorn'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'up_down_river'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'king_of_court'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'claim_throne'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'cream_crop'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'double_header'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'mixed_madness'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'scramble'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'shuffle'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'bracket'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'milp'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'gauntlet'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'pool_play'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE event_format ADD VALUE IF NOT EXISTS 'swiss'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
END $$;

-- Create match_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
        CREATE TYPE match_status AS ENUM (
            'scheduled',
            'in_progress',
            'completed',
            'cancelled'
        );
    END IF;
END $$;

-- Create scoring_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scoring_type') THEN
        CREATE TYPE scoring_type AS ENUM (
            'win_percentage',
            'court_weighted',
            'points',
            'games_won'
        );
    END IF;
END $$;

-- Create seeding_method enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seeding_method') THEN
        CREATE TYPE seeding_method AS ENUM (
            'rating',
            'random',
            'manual',
            'standings'
        );
    END IF;
END $$;

-- Create partner_mode enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_mode') THEN
        CREATE TYPE partner_mode AS ENUM (
            'rotating',
            'fixed'
        );
    END IF;
END $$;

-- Create gender enum for mixed formats
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_gender') THEN
        CREATE TYPE player_gender AS ENUM (
            'male',
            'female',
            'other',
            'prefer_not_to_say'
        );
    END IF;
END $$;

-- ============================================
-- BASE TABLES (if not already existing)
-- ============================================

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    organizer_id UUID,
    status VARCHAR(50) DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament events (divisions/brackets within a tournament)
CREATE TABLE IF NOT EXISTS tournament_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    format event_format NOT NULL DEFAULT 'round_robin',
    partner_mode partner_mode DEFAULT 'rotating',
    scoring_type scoring_type DEFAULT 'win_percentage',
    seeding_method seeding_method DEFAULT 'random',
    games_per_round INTEGER DEFAULT 1,
    number_of_courts INTEGER DEFAULT 1,
    min_players INTEGER DEFAULT 4,
    max_players INTEGER,
    settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    current_round INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations (players registered for events)
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    player_email VARCHAR(255),
    player_id UUID, -- For authenticated users
    rating DECIMAL(6,2),
    seed INTEGER,
    gender player_gender,
    team_id UUID, -- For fixed partner formats
    partner_id UUID REFERENCES registrations(id), -- Fixed partner
    status VARCHAR(50) DEFAULT 'confirmed',
    checked_in BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NEW TABLES FOR ROTATING PARTNER FORMATS
-- ============================================

-- Round games: individual games within rounds (4 players per game)
CREATE TABLE IF NOT EXISTS round_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    game_number INTEGER NOT NULL,
    court_number INTEGER NOT NULL DEFAULT 1,

    -- 4 players per game (for doubles)
    player1_id UUID REFERENCES registrations(id),
    player2_id UUID REFERENCES registrations(id),
    player3_id UUID REFERENCES registrations(id),
    player4_id UUID REFERENCES registrations(id),

    -- Team assignments (arrays of 2 player IDs each)
    team1_players UUID[] NOT NULL DEFAULT '{}',
    team2_players UUID[] NOT NULL DEFAULT '{}',

    -- Scores
    team1_score INTEGER,
    team2_score INTEGER,

    -- Status tracking
    status match_status DEFAULT 'scheduled',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Metadata for format-specific info
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_round_game UNIQUE (tournament_event_id, round, game_number)
);

-- Cumulative standings: tracks player stats across rounds
CREATE TABLE IF NOT EXISTS cumulative_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,

    -- Game statistics
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,

    -- Points statistics
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    point_differential INTEGER DEFAULT 0,

    -- Calculated metrics
    court_weighted_points DECIMAL(10,2) DEFAULT 0,
    win_percentage DECIMAL(5,4) DEFAULT 0,
    average_point_differential DECIMAL(6,2) DEFAULT 0,

    -- Current position
    current_court INTEGER,
    current_rank INTEGER,
    previous_rank INTEGER,

    -- Streak tracking
    current_streak INTEGER DEFAULT 0, -- Positive = wins, negative = losses
    best_streak INTEGER DEFAULT 0,

    -- Round-specific data
    rounds_played INTEGER DEFAULT 0,
    byes_taken INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_event_registration UNIQUE (tournament_event_id, registration_id)
);

-- Court weights: for court-weighted scoring systems
CREATE TABLE IF NOT EXISTS court_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL,
    weight DECIMAL(4,2) DEFAULT 1.0,
    name VARCHAR(50), -- e.g., "King Court", "Championship Court"
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_event_court UNIQUE (tournament_event_id, court_number)
);

-- Partnership history: tracks who has played with whom
CREATE TABLE IF NOT EXISTS partnership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    games_together INTEGER DEFAULT 0,
    wins_together INTEGER DEFAULT 0,
    last_round_together INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_partnership UNIQUE (tournament_event_id, player1_id, player2_id),
    CONSTRAINT ordered_players CHECK (player1_id < player2_id) -- Ensures consistent ordering
);

-- Opponent history: tracks who has played against whom
CREATE TABLE IF NOT EXISTS opponent_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    games_against INTEGER DEFAULT 0,
    wins_against INTEGER DEFAULT 0,
    last_round_against INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_opponent_pair UNIQUE (tournament_event_id, player1_id, player2_id),
    CONSTRAINT ordered_opponent_players CHECK (player1_id < player2_id)
);

-- ============================================
-- FIXED PARTNER FORMAT TABLES
-- ============================================

-- Teams: for fixed partner formats
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    name VARCHAR(255),
    seed INTEGER,
    rating DECIMAL(6,2),
    pool_id UUID, -- For pool play
    bracket_position INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members: links players to teams
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'player', -- player, captain, substitute
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_team_member UNIQUE (team_id, registration_id)
);

-- Pools: for pool play format
CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- "Pool A", "Pool B", etc.
    pool_number INTEGER NOT NULL,
    size INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_event_pool UNIQUE (tournament_event_id, pool_number)
);

-- Pool standings: tracks team standings within pools
CREATE TABLE IF NOT EXISTS pool_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    point_differential INTEGER DEFAULT 0,
    rank_in_pool INTEGER,
    advances_to_bracket BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_pool_team UNIQUE (pool_id, team_id)
);

-- Bracket matches: for elimination brackets
CREATE TABLE IF NOT EXISTS bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_event_id UUID NOT NULL REFERENCES tournament_events(id) ON DELETE CASCADE,
    bracket_type VARCHAR(50) DEFAULT 'main', -- main, consolation, winners, losers
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    court_number INTEGER,

    -- Teams
    team1_id UUID REFERENCES teams(id),
    team2_id UUID REFERENCES teams(id),

    -- For seeding placeholders before teams are determined
    team1_seed INTEGER,
    team2_seed INTEGER,
    team1_source VARCHAR(100), -- e.g., "Winner of Match 1", "Pool A #1"
    team2_source VARCHAR(100),

    -- Scores (can be multi-game)
    team1_scores INTEGER[] DEFAULT '{}',
    team2_scores INTEGER[] DEFAULT '{}',
    team1_games_won INTEGER DEFAULT 0,
    team2_games_won INTEGER DEFAULT 0,

    -- Winner advances to
    winner_advances_to UUID REFERENCES bracket_matches(id),
    loser_drops_to UUID REFERENCES bracket_matches(id), -- For double elim or consolation

    -- Status
    status match_status DEFAULT 'scheduled',
    winner_team_id UUID REFERENCES teams(id),
    scheduled_time TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_bracket_match UNIQUE (tournament_event_id, bracket_type, round, match_number)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_round_games_event ON round_games(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_round_games_round ON round_games(tournament_event_id, round);
CREATE INDEX IF NOT EXISTS idx_round_games_status ON round_games(status);

CREATE INDEX IF NOT EXISTS idx_cumulative_standings_event ON cumulative_standings(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_cumulative_standings_rank ON cumulative_standings(tournament_event_id, current_rank);

CREATE INDEX IF NOT EXISTS idx_partnership_history_event ON partnership_history(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_partnership_history_player1 ON partnership_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_partnership_history_player2 ON partnership_history(player2_id);

CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_pools_event ON pools(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_event ON bracket_matches(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_type_round ON bracket_matches(tournament_event_id, bracket_type, round);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(tournament_event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_team ON registrations(team_id);

-- ============================================
-- FUNCTIONS FOR STANDINGS CALCULATION
-- ============================================

-- Function to update cumulative standings after a game is completed
CREATE OR REPLACE FUNCTION update_standings_after_game()
RETURNS TRIGGER AS $$
DECLARE
    player_id UUID;
    team1_won BOOLEAN;
    points_for_val INTEGER;
    points_against_val INTEGER;
    court_weight DECIMAL(4,2);
BEGIN
    -- Only process completed games
    IF NEW.status = 'completed' AND NEW.team1_score IS NOT NULL AND NEW.team2_score IS NOT NULL THEN
        team1_won := NEW.team1_score > NEW.team2_score;

        -- Get court weight
        SELECT COALESCE(weight, 1.0) INTO court_weight
        FROM court_weights
        WHERE tournament_event_id = NEW.tournament_event_id AND court_number = NEW.court_number;

        IF court_weight IS NULL THEN
            court_weight := 1.0;
        END IF;

        -- Update standings for each player
        FOREACH player_id IN ARRAY NEW.team1_players || NEW.team2_players
        LOOP
            -- Determine if this player is on team1 or team2
            IF player_id = ANY(NEW.team1_players) THEN
                points_for_val := NEW.team1_score;
                points_against_val := NEW.team2_score;
            ELSE
                points_for_val := NEW.team2_score;
                points_against_val := NEW.team1_score;
            END IF;

            -- Upsert standings
            INSERT INTO cumulative_standings (
                tournament_event_id,
                registration_id,
                games_played,
                games_won,
                games_lost,
                points_for,
                points_against,
                point_differential,
                court_weighted_points,
                rounds_played
            )
            VALUES (
                NEW.tournament_event_id,
                player_id,
                1,
                CASE WHEN (player_id = ANY(NEW.team1_players) AND team1_won) OR
                         (player_id = ANY(NEW.team2_players) AND NOT team1_won) THEN 1 ELSE 0 END,
                CASE WHEN (player_id = ANY(NEW.team1_players) AND NOT team1_won) OR
                         (player_id = ANY(NEW.team2_players) AND team1_won) THEN 1 ELSE 0 END,
                points_for_val,
                points_against_val,
                points_for_val - points_against_val,
                CASE WHEN (player_id = ANY(NEW.team1_players) AND team1_won) OR
                         (player_id = ANY(NEW.team2_players) AND NOT team1_won)
                     THEN court_weight ELSE 0 END,
                1
            )
            ON CONFLICT (tournament_event_id, registration_id)
            DO UPDATE SET
                games_played = cumulative_standings.games_played + 1,
                games_won = cumulative_standings.games_won +
                    CASE WHEN (player_id = ANY(NEW.team1_players) AND team1_won) OR
                             (player_id = ANY(NEW.team2_players) AND NOT team1_won) THEN 1 ELSE 0 END,
                games_lost = cumulative_standings.games_lost +
                    CASE WHEN (player_id = ANY(NEW.team1_players) AND NOT team1_won) OR
                             (player_id = ANY(NEW.team2_players) AND team1_won) THEN 1 ELSE 0 END,
                points_for = cumulative_standings.points_for + points_for_val,
                points_against = cumulative_standings.points_against + points_against_val,
                point_differential = cumulative_standings.point_differential + (points_for_val - points_against_val),
                court_weighted_points = cumulative_standings.court_weighted_points +
                    CASE WHEN (player_id = ANY(NEW.team1_players) AND team1_won) OR
                             (player_id = ANY(NEW.team2_players) AND NOT team1_won)
                         THEN court_weight ELSE 0 END,
                win_percentage = CASE
                    WHEN cumulative_standings.games_played + 1 > 0
                    THEN (cumulative_standings.games_won +
                          CASE WHEN (player_id = ANY(NEW.team1_players) AND team1_won) OR
                                   (player_id = ANY(NEW.team2_players) AND NOT team1_won) THEN 1 ELSE 0 END
                         )::DECIMAL / (cumulative_standings.games_played + 1)
                    ELSE 0
                END,
                average_point_differential = CASE
                    WHEN cumulative_standings.games_played + 1 > 0
                    THEN (cumulative_standings.point_differential + (points_for_val - points_against_val))::DECIMAL /
                         (cumulative_standings.games_played + 1)
                    ELSE 0
                END,
                updated_at = NOW();
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating standings
DROP TRIGGER IF EXISTS trigger_update_standings ON round_games;
CREATE TRIGGER trigger_update_standings
    AFTER INSERT OR UPDATE OF status, team1_score, team2_score
    ON round_games
    FOR EACH ROW
    EXECUTE FUNCTION update_standings_after_game();

-- Function to update partnership history
CREATE OR REPLACE FUNCTION update_partnership_history()
RETURNS TRIGGER AS $$
DECLARE
    p1 UUID;
    p2 UUID;
    team1_won BOOLEAN;
BEGIN
    IF NEW.status = 'completed' THEN
        team1_won := NEW.team1_score > NEW.team2_score;

        -- Update team1 partnership
        IF array_length(NEW.team1_players, 1) = 2 THEN
            p1 := LEAST(NEW.team1_players[1], NEW.team1_players[2]);
            p2 := GREATEST(NEW.team1_players[1], NEW.team1_players[2]);

            INSERT INTO partnership_history (tournament_event_id, player1_id, player2_id, games_together, wins_together, last_round_together)
            VALUES (NEW.tournament_event_id, p1, p2, 1, CASE WHEN team1_won THEN 1 ELSE 0 END, NEW.round)
            ON CONFLICT (tournament_event_id, player1_id, player2_id)
            DO UPDATE SET
                games_together = partnership_history.games_together + 1,
                wins_together = partnership_history.wins_together + CASE WHEN team1_won THEN 1 ELSE 0 END,
                last_round_together = NEW.round,
                updated_at = NOW();
        END IF;

        -- Update team2 partnership
        IF array_length(NEW.team2_players, 1) = 2 THEN
            p1 := LEAST(NEW.team2_players[1], NEW.team2_players[2]);
            p2 := GREATEST(NEW.team2_players[1], NEW.team2_players[2]);

            INSERT INTO partnership_history (tournament_event_id, player1_id, player2_id, games_together, wins_together, last_round_together)
            VALUES (NEW.tournament_event_id, p1, p2, 1, CASE WHEN NOT team1_won THEN 1 ELSE 0 END, NEW.round)
            ON CONFLICT (tournament_event_id, player1_id, player2_id)
            DO UPDATE SET
                games_together = partnership_history.games_together + 1,
                wins_together = partnership_history.wins_together + CASE WHEN NOT team1_won THEN 1 ELSE 0 END,
                last_round_together = NEW.round,
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for partnership history
DROP TRIGGER IF EXISTS trigger_update_partnerships ON round_games;
CREATE TRIGGER trigger_update_partnerships
    AFTER INSERT OR UPDATE OF status
    ON round_games
    FOR EACH ROW
    EXECUTE FUNCTION update_partnership_history();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE cumulative_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;

-- Basic read policies (allow authenticated users to read all)
CREATE POLICY IF NOT EXISTS "Allow read access" ON tournaments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON tournament_events FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON registrations FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON round_games FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON cumulative_standings FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON court_weights FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON partnership_history FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON teams FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON pools FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow read access" ON bracket_matches FOR SELECT USING (true);

-- Note: Write policies should be added based on your authentication setup
-- Example: Only organizers can modify tournament data

-- ============================================
-- SEED DATA FOR COURT WEIGHTS (King of Court format)
-- ============================================

-- This is a template - actual court weights are created per event
COMMENT ON TABLE court_weights IS 'Court weights for court-weighted scoring. Higher courts = more points. King Court (Court 1) typically has highest weight.';

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View for current standings with rank
CREATE OR REPLACE VIEW v_current_standings AS
SELECT
    cs.*,
    r.player_name,
    r.rating,
    te.format,
    te.scoring_type,
    RANK() OVER (
        PARTITION BY cs.tournament_event_id
        ORDER BY
            CASE WHEN te.scoring_type = 'court_weighted' THEN cs.court_weighted_points ELSE 0 END DESC,
            cs.win_percentage DESC,
            cs.point_differential DESC,
            cs.games_won DESC
    ) as calculated_rank
FROM cumulative_standings cs
JOIN registrations r ON cs.registration_id = r.id
JOIN tournament_events te ON cs.tournament_event_id = te.id;

-- View for round summary
CREATE OR REPLACE VIEW v_round_summary AS
SELECT
    tournament_event_id,
    round,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_games,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_games,
    COUNT(DISTINCT court_number) as courts_used
FROM round_games
GROUP BY tournament_event_id, round;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE round_games IS 'Individual games within rounds for rotating partner formats. Each game has 4 players split into 2 teams.';
COMMENT ON TABLE cumulative_standings IS 'Tracks cumulative player statistics across all rounds. Updated automatically via trigger.';
COMMENT ON TABLE court_weights IS 'Defines point multipliers for each court in court-weighted scoring formats.';
COMMENT ON TABLE partnership_history IS 'Tracks which players have partnered together to ensure variety in partnerships.';
COMMENT ON TABLE pools IS 'Pool definitions for pool play format. Teams are assigned to pools for round-robin play.';
COMMENT ON TABLE bracket_matches IS 'Bracket matches for elimination formats. Supports main, consolation, winners, and losers brackets.';

COMMENT ON COLUMN round_games.team1_players IS 'Array of 2 registration IDs representing team 1';
COMMENT ON COLUMN round_games.team2_players IS 'Array of 2 registration IDs representing team 2';
COMMENT ON COLUMN cumulative_standings.court_weighted_points IS 'Points earned based on court weights - higher courts = more points per win';
COMMENT ON COLUMN cumulative_standings.current_streak IS 'Positive numbers = win streak, negative = loss streak';
