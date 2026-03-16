//! Reward calculation and distribution

use crate::types::*;
use crate::state::MinerAccount;

/// Reward calculator
pub struct RewardCalculator {
    /// Base reward per task (tokens)
    pub base_reward: TokenAmount,
    /// Quality bonus threshold (score)
    pub quality_threshold: u8,
    /// Quality bonus amount
    pub quality_bonus: TokenAmount,
    /// Speed bonus threshold (ms)
    pub speed_threshold_ms: u64,
    /// Speed bonus amount
    pub speed_bonus: TokenAmount,
    /// Treasury fee (basis points)
    pub treasury_fee_bps: u32,
}

impl Default for RewardCalculator {
    fn default() -> Self {
        Self {
            base_reward: 10_000_000_000, // 10 tokens
            quality_threshold: 80,
            quality_bonus: 5_000_000_000, // 5 tokens
            speed_threshold_ms: 30_000,
            speed_bonus: 3_000_000_000, // 3 tokens
            treasury_fee_bps: 500,      // 5%
        }
    }
}

impl RewardCalculator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Calculate reward for a task completion
    pub fn calculate(
        &self,
        miner: &MinerAccount,
        score: Score,
        processing_time_ms: u64,
        difficulty: Difficulty,
    ) -> RewardBreakdown {
        // Base reward from difficulty
        let base = difficulty.base_reward();

        // Quality bonus
        let quality = if score.as_u8() >= self.quality_threshold {
            self.quality_bonus
        } else {
            0
        };

        // Speed bonus
        let speed = if processing_time_ms < self.speed_threshold_ms {
            self.speed_bonus
        } else {
            0
        };

        // Subtotal before multipliers
        let subtotal = base + quality + speed;

        // Apply miner's multiplier
        let multiplier_bps = miner.reward_multiplier_bps();
        let after_multiplier = (subtotal as u128 * multiplier_bps as u128 / 10000) as u64;

        // Treasury fee
        let treasury_fee = after_multiplier * self.treasury_fee_bps as u64 / 10000;
        let final_reward = after_multiplier - treasury_fee;

        RewardBreakdown {
            base,
            quality_bonus: quality,
            speed_bonus: speed,
            subtotal,
            multiplier_bps,
            after_multiplier,
            treasury_fee,
            final_reward,
        }
    }

    /// Calculate streak bonus
    pub fn streak_bonus(&self, streak_days: u16) -> TokenAmount {
        // Bonus increases with streak: 1 token per day, max 30
        let days = streak_days.min(30) as u64;
        days * 1_000_000_000 // 1 token per day
    }

    /// Calculate daily login bonus
    pub fn daily_bonus(&self, consecutive_days: u16) -> TokenAmount {
        let base = 5_000_000_000; // 5 tokens
        let bonus_per_day = 500_000_000; // 0.5 tokens per consecutive day
        let max_bonus = 25_000_000_000; // Max 25 tokens total

        let total = base + (consecutive_days as u64 * bonus_per_day);
        total.min(max_bonus)
    }

    /// Calculate referral reward
    pub fn referral_reward(&self, referee_reward: TokenAmount) -> TokenAmount {
        // 10% of referee's earnings
        referee_reward / 10
    }

    /// Calculate jackpot contribution
    pub fn jackpot_contribution(&self, reward: TokenAmount) -> TokenAmount {
        // 1% goes to jackpot pool
        reward / 100
    }
}

/// Breakdown of reward calculation
#[derive(Debug, Clone)]
pub struct RewardBreakdown {
    pub base: TokenAmount,
    pub quality_bonus: TokenAmount,
    pub speed_bonus: TokenAmount,
    pub subtotal: TokenAmount,
    pub multiplier_bps: u32,
    pub after_multiplier: TokenAmount,
    pub treasury_fee: TokenAmount,
    pub final_reward: TokenAmount,
}

/// Jackpot pool
#[derive(Debug, Clone)]
pub struct JackpotPool {
    pub pool_type: JackpotType,
    pub balance: TokenAmount,
    pub trigger_count: u64,
    pub current_count: u64,
    pub multiplier: u32,
    pub last_winner: Option<MinerId>,
    pub last_won_at: Option<Timestamp>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JackpotType {
    Mini,
    Regular,
    Mega,
    Ultra,
}

impl JackpotPool {
    pub fn new(pool_type: JackpotType) -> Self {
        let (trigger_count, multiplier) = match pool_type {
            JackpotType::Mini => (50, 32),
            JackpotType::Regular => (500, 144),
            JackpotType::Mega => (5000, 699),
            JackpotType::Ultra => (50000, 5163),
        };

        Self {
            pool_type,
            balance: 0,
            trigger_count,
            current_count: 0,
            multiplier,
            last_winner: None,
            last_won_at: None,
        }
    }

    /// Add contribution to pool
    pub fn contribute(&mut self, amount: TokenAmount) {
        self.balance = self.balance.saturating_add(amount);
        self.current_count += 1;
    }

    /// Check if jackpot should trigger
    pub fn should_trigger(&self) -> bool {
        self.current_count >= self.trigger_count
    }

    /// Trigger jackpot and return winner's prize
    pub fn trigger(&mut self, winner: MinerId, timestamp: Timestamp) -> TokenAmount {
        let prize = self.balance * self.multiplier as u64 / 100;
        self.balance = 0;
        self.current_count = 0;
        self.last_winner = Some(winner);
        self.last_won_at = Some(timestamp);
        prize
    }

    /// Progress percentage
    pub fn progress_percent(&self) -> u8 {
        ((self.current_count * 100) / self.trigger_count).min(100) as u8
    }
}

/// Tournament prize distribution
pub struct TournamentRewards;

impl TournamentRewards {
    /// Calculate prizes for top N
    pub fn calculate_prizes(total_pool: TokenAmount, num_winners: usize) -> Vec<TokenAmount> {
        if num_winners == 0 {
            return Vec::new();
        }

        // Distribution: 50%, 30%, 20% for top 3, then equal split
        match num_winners {
            1 => vec![total_pool],
            2 => vec![total_pool * 60 / 100, total_pool * 40 / 100],
            3 => vec![
                total_pool * 50 / 100,
                total_pool * 30 / 100,
                total_pool * 20 / 100,
            ],
            n => {
                let mut prizes = vec![
                    total_pool * 40 / 100, // 1st
                    total_pool * 25 / 100, // 2nd
                    total_pool * 15 / 100, // 3rd
                ];
                let remaining = total_pool * 20 / 100;
                let share = remaining / (n - 3) as u64;
                for _ in 3..n {
                    prizes.push(share);
                }
                prizes
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reward_calculation() {
        let calc = RewardCalculator::new();
        let miner = MinerAccount::new(
            solana_sdk::pubkey::Pubkey::new_unique(),
            "Test".to_string(),
            0,
        );

        let breakdown = calc.calculate(&miner, Score::new(85), 20000, Difficulty::Easy);

        assert!(breakdown.quality_bonus > 0);
        assert!(breakdown.speed_bonus > 0);
        assert!(breakdown.final_reward > 0);
    }

    #[test]
    fn test_jackpot() {
        let mut pool = JackpotPool::new(JackpotType::Mini);
        for _ in 0..49 {
            pool.contribute(1_000_000_000);
            assert!(!pool.should_trigger());
        }
        pool.contribute(1_000_000_000);
        assert!(pool.should_trigger());
    }
}
