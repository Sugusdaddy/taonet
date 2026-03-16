//! Stake-weighted miner selection

use taonet_runtime::{
    types::*,
    state::MinerAccount,
};
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use std::collections::HashMap;

/// Miner selector for task assignment
pub struct MinerSelector {
    /// Minimum reputation to be eligible
    min_reputation: u8,
    /// Maximum concurrent tasks per miner
    max_concurrent: usize,
    /// Weight factors
    weights: SelectionWeights,
}

/// Weights for selection scoring
#[derive(Debug, Clone)]
pub struct SelectionWeights {
    pub stake: f64,
    pub reputation: f64,
    pub success_rate: f64,
    pub availability: f64,
}

impl Default for SelectionWeights {
    fn default() -> Self {
        Self {
            stake: 0.4,
            reputation: 0.3,
            success_rate: 0.2,
            availability: 0.1,
        }
    }
}

impl Default for MinerSelector {
    fn default() -> Self {
        Self {
            min_reputation: 30,
            max_concurrent: 5,
            weights: SelectionWeights::default(),
        }
    }
}

impl MinerSelector {
    pub fn new(min_reputation: u8, max_concurrent: usize) -> Self {
        Self {
            min_reputation,
            max_concurrent,
            weights: SelectionWeights::default(),
        }
    }

    /// Select miners for a task
    pub fn select(
        &self,
        task_type: TaskType,
        difficulty: Difficulty,
        miners: &HashMap<MinerId, MinerAccount>,
        current_assignments: &HashMap<MinerId, usize>,
        count: usize,
        seed: u64,
    ) -> Vec<MinerId> {
        // Filter eligible miners
        let mut eligible: Vec<_> = miners
            .values()
            .filter(|m| self.is_eligible(m, task_type, current_assignments))
            .collect();

        if eligible.is_empty() {
            return Vec::new();
        }

        // Calculate scores
        let mut scored: Vec<(MinerId, f64)> = eligible
            .iter()
            .map(|m| (m.address, self.calculate_score(m, difficulty)))
            .collect();

        // Sort by score descending
        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Weighted random selection from top candidates
        let mut rng = StdRng::seed_from_u64(seed);
        let mut selected = Vec::new();
        let pool_size = (count * 3).min(scored.len());
        let pool = &scored[..pool_size];

        // Calculate total weight for probability
        let total_weight: f64 = pool.iter().map(|(_, score)| score).sum();

        for _ in 0..count {
            if pool.is_empty() {
                break;
            }

            // Weighted random selection
            let mut roll = rng.gen::<f64>() * total_weight;
            for (miner_id, score) in pool.iter() {
                roll -= score;
                if roll <= 0.0 && !selected.contains(miner_id) {
                    selected.push(*miner_id);
                    break;
                }
            }
        }

        selected
    }

    /// Check if miner is eligible for task
    fn is_eligible(
        &self,
        miner: &MinerAccount,
        task_type: TaskType,
        current_assignments: &HashMap<MinerId, usize>,
    ) -> bool {
        // Must be online
        if !miner.is_online {
            return false;
        }

        // Must have minimum reputation
        if miner.reputation < self.min_reputation {
            return false;
        }

        // Must support task type
        if !miner.capabilities.contains(&task_type) {
            return false;
        }

        // Must not be at max concurrent tasks
        let current = current_assignments.get(&miner.address).unwrap_or(&0);
        if *current >= self.max_concurrent {
            return false;
        }

        // Must not be slashed too many times
        if miner.slash_count >= 3 {
            return false;
        }

        true
    }

    /// Calculate selection score for miner
    fn calculate_score(&self, miner: &MinerAccount, difficulty: Difficulty) -> f64 {
        let mut score = 0.0;

        // Stake weight (logarithmic to prevent whale dominance)
        let stake_factor = if miner.staked > 0 {
            (miner.staked as f64).log10() / 20.0 // Normalize
        } else {
            0.1
        };
        score += stake_factor * self.weights.stake * 100.0;

        // Reputation weight
        score += (miner.reputation as f64) * self.weights.reputation;

        // Success rate weight
        let total_tasks = miner.tasks_completed + miner.tasks_failed;
        let success_rate = if total_tasks > 0 {
            miner.tasks_completed as f64 / total_tasks as f64
        } else {
            0.5 // Neutral for new miners
        };
        score += success_rate * self.weights.success_rate * 100.0;

        // Tier bonus
        let tier_bonus = match miner.tier {
            StakingTier::Diamond => 20.0,
            StakingTier::Platinum => 15.0,
            StakingTier::Gold => 10.0,
            StakingTier::Silver => 5.0,
            StakingTier::Bronze => 0.0,
        };
        score += tier_bonus;

        // Difficulty matching (higher tiers for harder tasks)
        let difficulty_match = match (difficulty, miner.tier) {
            (Difficulty::Expert, StakingTier::Diamond | StakingTier::Platinum) => 10.0,
            (Difficulty::Hard, StakingTier::Gold | StakingTier::Platinum | StakingTier::Diamond) => 8.0,
            (Difficulty::Medium, _) => 5.0,
            (Difficulty::Easy, _) => 3.0,
            _ => 0.0,
        };
        score += difficulty_match;

        // Level bonus
        score += (miner.level as f64).min(20.0);

        // Streak bonus (reliability indicator)
        score += (miner.current_streak as f64).min(10.0);

        score
    }

    /// Select backup miners in case primaries fail
    pub fn select_backups(
        &self,
        primary: &[MinerId],
        miners: &HashMap<MinerId, MinerAccount>,
        count: usize,
        seed: u64,
    ) -> Vec<MinerId> {
        let eligible: Vec<_> = miners
            .values()
            .filter(|m| m.is_online && m.reputation >= self.min_reputation && !primary.contains(&m.address))
            .map(|m| m.address)
            .collect();

        if eligible.len() <= count {
            return eligible;
        }

        let mut rng = StdRng::seed_from_u64(seed);
        let mut selected = Vec::new();
        let mut pool = eligible;

        for _ in 0..count {
            if pool.is_empty() {
                break;
            }
            let idx = rng.gen_range(0..pool.len());
            selected.push(pool.remove(idx));
        }

        selected
    }
}

/// Committee for task validation (multi-miner consensus)
#[derive(Debug, Clone)]
pub struct ValidationCommittee {
    pub task_id: TaskId,
    pub primary_miners: Vec<MinerId>,
    pub backup_miners: Vec<MinerId>,
    pub required_responses: usize,
    pub formed_at: Timestamp,
}

impl ValidationCommittee {
    pub fn new(
        task_id: TaskId,
        primary_miners: Vec<MinerId>,
        backup_miners: Vec<MinerId>,
        formed_at: Timestamp,
    ) -> Self {
        let required_responses = (primary_miners.len() / 2) + 1; // Majority

        Self {
            task_id,
            primary_miners,
            backup_miners,
            required_responses,
            formed_at,
        }
    }

    /// Check if we have enough responses for consensus
    pub fn has_quorum(&self, response_count: usize) -> bool {
        response_count >= self.required_responses
    }

    /// Get all committee members
    pub fn all_members(&self) -> Vec<MinerId> {
        let mut all = self.primary_miners.clone();
        all.extend(&self.backup_miners);
        all
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::pubkey::Pubkey;

    #[test]
    fn test_miner_selection() {
        let selector = MinerSelector::default();
        let mut miners = HashMap::new();

        // Add some test miners
        for i in 0..5 {
            let address = Pubkey::new_unique();
            let mut miner = MinerAccount::new(address, format!("Miner{}", i), 0);
            miner.is_online = true;
            miner.reputation = 50 + i * 10;
            miner.stake(i as u64 * 10_000_000_000_000);
            miners.insert(address, miner);
        }

        let current_assignments = HashMap::new();
        let selected = selector.select(
            TaskType::Text,
            Difficulty::Easy,
            &miners,
            &current_assignments,
            3,
            12345,
        );

        assert!(!selected.is_empty());
        assert!(selected.len() <= 3);
    }
}
