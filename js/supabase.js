// Supabase configuration
const SUPABASE_URL = 'https://xiwajrfbeccvkneqydwu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2FqcmZiZWNjdmtuZXF5ZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTc2NDgsImV4cCI6MjA3ODI3MzY0OH0.0pb0lh9O1eHrtkJtkOLHfFP2jICB2pAvGjeTIAxBbAUyour-anon-key';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class GameDatabase {
    constructor() {
        this.playerId = this.generatePlayerId();
        this.cachedScores = null;
    }

    generatePlayerId() {
        let id = localStorage.getItem('cheetahDashPlayerId');
        if (!id) {
            id = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('cheetahDashPlayerId', id);
        }
        return id;
    }

    // Submit score to leaderboard
    async submitScore(playerName, score, distance) {
        try {
            const { data, error } = await supabase
                .from('scores')
                .insert([
                    {
                        player_name: playerName,
                        score: score,
                        distance: distance,
                        player_id: this.playerId
                    }
                ])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error submitting score:', error);
            return null;
        }
    }

    // Get top 10 high scores
    async getHighScores() {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('player_name, score, distance, created_at')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;
            this.cachedScores = data;
            return data;
        } catch (error) {
            console.error('Error fetching scores:', error);
            return this.cachedScores || [];
        }
    }

    // Get player's personal best
    async getPersonalBest() {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('score')
                .eq('player_id', this.playerId)
                .order('score', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
            return data ? data.score : 0;
        } catch (error) {
            console.error('Error fetching personal best:', error);
            return 0;
        }
    }

    // Get total number of players (approximate)
    async getTotalPlayers() {
        try {
            const { count, error } = await supabase
                .from('scores')
                .select('player_id', { count: 'exact', head: true });

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error fetching player count:', error);
            return 0;
        }
    }
}

const gameDB = new GameDatabase();