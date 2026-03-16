//! TaoNet Bridge - L1 <-> L2 Communication
//!
//! Handles deposits, withdrawals, and state synchronization
//! between Solana L1 and TaoNet L2.

pub mod deposit;
pub mod withdraw;
pub mod sync;
pub mod l1_client;

pub use deposit::*;
pub use withdraw::*;
pub use sync::*;
pub use l1_client::*;

use taonet_runtime::types::*;

/// Bridge configuration
#[derive(Debug, Clone)]
pub struct BridgeConfig {
    /// Solana RPC URL
    pub solana_rpc: String,
    /// Bridge program ID on Solana
    pub bridge_program_id: MinerId,
    /// Token mint address
    pub token_mint: MinerId,
    /// Minimum deposit amount
    pub min_deposit: TokenAmount,
    /// Minimum withdrawal amount
    pub min_withdrawal: TokenAmount,
    /// Withdrawal delay in blocks
    pub withdrawal_delay_blocks: u64,
    /// Challenge period for fraud proofs (in L1 slots)
    pub challenge_period_slots: u64,
}

impl Default for BridgeConfig {
    fn default() -> Self {
        Self {
            solana_rpc: "https://api.mainnet-beta.solana.com".to_string(),
            bridge_program_id: MinerId::default(),
            token_mint: MinerId::default(),
            min_deposit: 1_000_000_000,      // 1 token
            min_withdrawal: 1_000_000_000,    // 1 token
            withdrawal_delay_blocks: 100,     // ~100 seconds on L2
            challenge_period_slots: 150,      // ~1 minute on Solana
        }
    }
}

/// Bridge state stored on L1
#[derive(Debug, Clone)]
pub struct BridgeState {
    /// Total tokens deposited
    pub total_deposited: TokenAmount,
    /// Total tokens withdrawn
    pub total_withdrawn: TokenAmount,
    /// Latest L2 state root committed
    pub latest_state_root: Hash,
    /// Latest L2 block height committed
    pub latest_l2_height: BlockHeight,
    /// Last L1 slot updated
    pub last_update_slot: L1Slot,
}

/// Events emitted by the bridge
#[derive(Debug, Clone)]
pub enum BridgeEvent {
    Deposit {
        user: MinerId,
        amount: TokenAmount,
        l1_tx: Hash,
        timestamp: Timestamp,
    },
    WithdrawalInitiated {
        user: MinerId,
        amount: TokenAmount,
        l2_block: BlockHeight,
        unlock_block: BlockHeight,
    },
    WithdrawalCompleted {
        user: MinerId,
        amount: TokenAmount,
        l1_tx: Hash,
    },
    StateRootUpdated {
        l2_height: BlockHeight,
        state_root: Hash,
        proof_root: Hash,
    },
    FraudProofSubmitted {
        challenger: MinerId,
        l2_height: BlockHeight,
        reason: String,
    },
}
