//! Core types for TaoNet L2

use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

/// Unique identifier for tasks
pub type TaskId = [u8; 32];

/// Unique identifier for miners
pub type MinerId = Pubkey;

/// Token amount (with 9 decimals)
pub type TokenAmount = u64;

/// Timestamp in Unix milliseconds
pub type Timestamp = i64;

/// Task types supported by the network
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum TaskType {
    Text,
    Code,
    Image,
    Trading,
    Custom,
}

/// Task status in the lifecycle
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum TaskStatus {
    Pending,
    Assigned,
    Processing,
    Validating,
    Completed,
    Failed,
    Expired,
}

/// Miner staking tier
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum StakingTier {
    Bronze = 0,
    Silver = 1,
    Gold = 2,
    Platinum = 3,
    Diamond = 4,
}

impl StakingTier {
    /// Minimum stake required for tier (in token base units)
    pub fn min_stake(&self) -> TokenAmount {
        match self {
            StakingTier::Bronze => 0,
            StakingTier::Silver => 10_000_000_000_000,      // 10K tokens
            StakingTier::Gold => 100_000_000_000_000,       // 100K tokens
            StakingTier::Platinum => 1_000_000_000_000_000, // 1M tokens
            StakingTier::Diamond => 10_000_000_000_000_000, // 10M tokens
        }
    }

    /// Reward multiplier for tier (basis points, 10000 = 1x)
    pub fn multiplier_bps(&self) -> u32 {
        match self {
            StakingTier::Bronze => 10000,   // 1.0x
            StakingTier::Silver => 12500,   // 1.25x
            StakingTier::Gold => 15000,     // 1.5x
            StakingTier::Platinum => 20000, // 2.0x
            StakingTier::Diamond => 30000,  // 3.0x
        }
    }

    /// Get tier from staked amount
    pub fn from_stake(amount: TokenAmount) -> Self {
        if amount >= StakingTier::Diamond.min_stake() {
            StakingTier::Diamond
        } else if amount >= StakingTier::Platinum.min_stake() {
            StakingTier::Platinum
        } else if amount >= StakingTier::Gold.min_stake() {
            StakingTier::Gold
        } else if amount >= StakingTier::Silver.min_stake() {
            StakingTier::Silver
        } else {
            StakingTier::Bronze
        }
    }
}

/// Task difficulty level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

impl Difficulty {
    /// Base reward for difficulty (before multipliers)
    pub fn base_reward(&self) -> TokenAmount {
        match self {
            Difficulty::Easy => 5_000_000_000,    // 5 tokens
            Difficulty::Medium => 10_000_000_000, // 10 tokens
            Difficulty::Hard => 25_000_000_000,   // 25 tokens
            Difficulty::Expert => 50_000_000_000, // 50 tokens
        }
    }

    /// Timeout in milliseconds
    pub fn timeout_ms(&self) -> u64 {
        match self {
            Difficulty::Easy => 60_000,    // 1 min
            Difficulty::Medium => 120_000, // 2 min
            Difficulty::Hard => 300_000,   // 5 min
            Difficulty::Expert => 600_000, // 10 min
        }
    }
}

/// Response score (0-100)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Score(pub u8);

impl Score {
    pub fn new(value: u8) -> Self {
        Self(value.min(100))
    }

    pub fn as_u8(&self) -> u8 {
        self.0
    }

    /// Check if score qualifies for quality bonus
    pub fn qualifies_for_bonus(&self) -> bool {
        self.0 >= 80
    }
}

/// Block height on L2
pub type BlockHeight = u64;

/// Slot on Solana L1
pub type L1Slot = u64;

/// Hash type (32 bytes)
pub type Hash = [u8; 32];

/// Signature type (64 bytes)
pub type Signature = [u8; 64];
