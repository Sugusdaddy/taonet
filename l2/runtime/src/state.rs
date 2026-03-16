//! L2 State Management

use crate::types::*;
use crate::task::{Task, TaskResponse};
use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// Miner account state
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct MinerAccount {
    /// Miner's public key
    pub address: MinerId,
    /// Display name
    pub name: String,
    /// Staked amount
    pub staked: TokenAmount,
    /// Current tier
    pub tier: StakingTier,
    /// Reputation score (0-100)
    pub reputation: u8,
    /// Total tasks completed
    pub tasks_completed: u64,
    /// Total tasks failed
    pub tasks_failed: u64,
    /// Total rewards earned
    pub total_rewards: TokenAmount,
    /// Current streak (days)
    pub current_streak: u16,
    /// Longest streak
    pub longest_streak: u16,
    /// XP for leveling
    pub xp: u64,
    /// Current level
    pub level: u16,
    /// When registered
    pub created_at: Timestamp,
    /// Last activity
    pub last_active: Timestamp,
    /// Is currently online
    pub is_online: bool,
    /// Capabilities
    pub capabilities: Vec<TaskType>,
    /// Pending rewards (not yet withdrawn)
    pub pending_rewards: TokenAmount,
    /// Slash count (for penalties)
    pub slash_count: u8,
}

impl MinerAccount {
    pub fn new(address: MinerId, name: String, created_at: Timestamp) -> Self {
        Self {
            address,
            name,
            staked: 0,
            tier: StakingTier::Bronze,
            reputation: 50,
            tasks_completed: 0,
            tasks_failed: 0,
            total_rewards: 0,
            current_streak: 0,
            longest_streak: 0,
            xp: 0,
            level: 1,
            created_at,
            last_active: created_at,
            is_online: false,
            capabilities: vec![TaskType::Text],
            pending_rewards: 0,
            slash_count: 0,
        }
    }

    /// Update tier based on stake
    pub fn update_tier(&mut self) {
        self.tier = StakingTier::from_stake(self.staked);
    }

    /// Add stake
    pub fn stake(&mut self, amount: TokenAmount) {
        self.staked = self.staked.saturating_add(amount);
        self.update_tier();
    }

    /// Remove stake
    pub fn unstake(&mut self, amount: TokenAmount) -> Result<TokenAmount, StateError> {
        if amount > self.staked {
            return Err(StateError::InsufficientStake);
        }
        self.staked = self.staked.saturating_sub(amount);
        self.update_tier();
        Ok(amount)
    }

    /// Record task completion
    pub fn complete_task(&mut self, reward: TokenAmount, score: Score) {
        self.tasks_completed += 1;
        self.pending_rewards = self.pending_rewards.saturating_add(reward);
        self.total_rewards = self.total_rewards.saturating_add(reward);

        // Update reputation based on score
        if score.as_u8() >= 80 {
            self.reputation = self.reputation.saturating_add(1).min(100);
        } else if score.as_u8() < 50 {
            self.reputation = self.reputation.saturating_sub(1);
        }

        // Add XP
        let xp_earned = 10 + (score.as_u8() as u64 / 10);
        self.add_xp(xp_earned);
    }

    /// Record task failure
    pub fn fail_task(&mut self) {
        self.tasks_failed += 1;
        self.reputation = self.reputation.saturating_sub(2);
        self.current_streak = 0;
    }

    /// Add XP and check for level up
    fn add_xp(&mut self, amount: u64) {
        self.xp += amount;
        let xp_for_next = self.xp_for_level(self.level + 1);
        if self.xp >= xp_for_next {
            self.level += 1;
        }
    }

    /// XP required for a level
    fn xp_for_level(&self, level: u16) -> u64 {
        // Exponential curve: 100 * 1.5^level
        (100.0 * 1.5_f64.powi(level as i32)) as u64
    }

    /// Calculate reward multiplier (basis points)
    pub fn reward_multiplier_bps(&self) -> u32 {
        let tier_mult = self.tier.multiplier_bps();
        let streak_mult = 10000 + (self.current_streak as u32 * 33).min(10000); // Up to 2x
        let level_mult = 10000 + ((self.level as u32 - 1) * 50).min(5000); // Up to 1.5x

        // Combined: (tier * streak * level) / 10000^2
        ((tier_mult as u64 * streak_mult as u64 * level_mult as u64) / 100_000_000) as u32
    }

    /// Withdraw pending rewards
    pub fn withdraw(&mut self) -> TokenAmount {
        let amount = self.pending_rewards;
        self.pending_rewards = 0;
        amount
    }
}

/// Global L2 state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct L2State {
    /// Current block height
    pub block_height: BlockHeight,
    /// State root hash
    pub state_root: Hash,
    /// Last L1 slot synced
    pub last_l1_slot: L1Slot,
    /// All miner accounts
    pub miners: HashMap<MinerId, MinerAccount>,
    /// All tasks
    pub tasks: HashMap<TaskId, Task>,
    /// Task responses
    pub responses: HashMap<TaskId, Vec<TaskResponse>>,
    /// Total tokens in circulation on L2
    pub total_supply: TokenAmount,
    /// Treasury balance
    pub treasury: TokenAmount,
    /// Global stats
    pub stats: GlobalStats,
}

/// Global network statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GlobalStats {
    pub total_tasks: u64,
    pub completed_tasks: u64,
    pub failed_tasks: u64,
    pub total_rewards_distributed: TokenAmount,
    pub total_miners: u64,
    pub active_miners: u64,
}

impl L2State {
    pub fn new() -> Self {
        Self {
            block_height: 0,
            state_root: [0u8; 32],
            last_l1_slot: 0,
            miners: HashMap::new(),
            tasks: HashMap::new(),
            responses: HashMap::new(),
            total_supply: 0,
            treasury: 0,
            stats: GlobalStats::default(),
        }
    }

    /// Compute state root hash
    pub fn compute_state_root(&mut self) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(&self.block_height.to_le_bytes());
        hasher.update(&self.stats.total_tasks.to_le_bytes());
        hasher.update(&self.total_supply.to_le_bytes());
        // In production, would merkelize all accounts and tasks
        self.state_root = hasher.finalize().into();
        self.state_root
    }

    /// Register new miner
    pub fn register_miner(
        &mut self,
        address: MinerId,
        name: String,
        timestamp: Timestamp,
    ) -> Result<(), StateError> {
        if self.miners.contains_key(&address) {
            return Err(StateError::AlreadyExists);
        }

        let miner = MinerAccount::new(address, name, timestamp);
        self.miners.insert(address, miner);
        self.stats.total_miners += 1;
        Ok(())
    }

    /// Get miner account
    pub fn get_miner(&self, address: &MinerId) -> Option<&MinerAccount> {
        self.miners.get(address)
    }

    /// Get mutable miner account
    pub fn get_miner_mut(&mut self, address: &MinerId) -> Option<&mut MinerAccount> {
        self.miners.get_mut(address)
    }

    /// Submit new task
    pub fn submit_task(&mut self, task: Task) -> Result<TaskId, StateError> {
        let id = task.id;
        if self.tasks.contains_key(&id) {
            return Err(StateError::AlreadyExists);
        }

        self.tasks.insert(id, task);
        self.responses.insert(id, Vec::new());
        self.stats.total_tasks += 1;
        Ok(id)
    }

    /// Get task
    pub fn get_task(&self, id: &TaskId) -> Option<&Task> {
        self.tasks.get(id)
    }

    /// Get mutable task
    pub fn get_task_mut(&mut self, id: &TaskId) -> Option<&mut Task> {
        self.tasks.get_mut(id)
    }
}

impl Default for L2State {
    fn default() -> Self {
        Self::new()
    }
}

/// Errors in state operations
#[derive(Debug, thiserror::Error)]
pub enum StateError {
    #[error("Account or task already exists")]
    AlreadyExists,
    #[error("Account or task not found")]
    NotFound,
    #[error("Insufficient stake")]
    InsufficientStake,
    #[error("Insufficient balance")]
    InsufficientBalance,
    #[error("Invalid operation")]
    InvalidOperation,
}
