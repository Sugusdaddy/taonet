//! Deposit handling - L1 -> L2

use crate::{BridgeConfig, BridgeEvent};
use taonet_runtime::types::*;
use solana_sdk::pubkey::Pubkey;
use std::collections::HashMap;
use tokio::sync::RwLock;

/// Pending deposit
#[derive(Debug, Clone)]
pub struct PendingDeposit {
    pub user: MinerId,
    pub amount: TokenAmount,
    pub l1_tx: Hash,
    pub l1_slot: L1Slot,
    pub status: DepositStatus,
    pub created_at: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DepositStatus {
    Pending,
    Confirmed,
    Credited,
    Failed,
}

/// Deposit handler
pub struct DepositHandler {
    config: BridgeConfig,
    /// Pending deposits by L1 tx hash
    pending: RwLock<HashMap<Hash, PendingDeposit>>,
    /// Required confirmations
    required_confirmations: u64,
}

impl DepositHandler {
    pub fn new(config: BridgeConfig) -> Self {
        Self {
            config,
            pending: RwLock::new(HashMap::new()),
            required_confirmations: 32, // ~12 seconds on Solana
        }
    }

    /// Record a new deposit from L1
    pub async fn record_deposit(
        &self,
        user: MinerId,
        amount: TokenAmount,
        l1_tx: Hash,
        l1_slot: L1Slot,
    ) -> Result<BridgeEvent, DepositError> {
        // Validate amount
        if amount < self.config.min_deposit {
            return Err(DepositError::AmountTooSmall);
        }

        let deposit = PendingDeposit {
            user,
            amount,
            l1_tx,
            l1_slot,
            status: DepositStatus::Pending,
            created_at: chrono::Utc::now().timestamp_millis(),
        };

        let mut pending = self.pending.write().await;
        pending.insert(l1_tx, deposit.clone());

        Ok(BridgeEvent::Deposit {
            user,
            amount,
            l1_tx,
            timestamp: deposit.created_at,
        })
    }

    /// Confirm deposit after required L1 confirmations
    pub async fn confirm_deposit(
        &self,
        l1_tx: Hash,
        current_slot: L1Slot,
    ) -> Result<PendingDeposit, DepositError> {
        let mut pending = self.pending.write().await;
        
        let deposit = pending.get_mut(&l1_tx).ok_or(DepositError::NotFound)?;

        if deposit.status != DepositStatus::Pending {
            return Err(DepositError::AlreadyProcessed);
        }

        // Check confirmations
        let confirmations = current_slot.saturating_sub(deposit.l1_slot);
        if confirmations < self.required_confirmations {
            return Err(DepositError::InsufficientConfirmations);
        }

        deposit.status = DepositStatus::Confirmed;
        Ok(deposit.clone())
    }

    /// Mark deposit as credited on L2
    pub async fn mark_credited(&self, l1_tx: Hash) -> Result<(), DepositError> {
        let mut pending = self.pending.write().await;
        
        let deposit = pending.get_mut(&l1_tx).ok_or(DepositError::NotFound)?;
        deposit.status = DepositStatus::Credited;
        
        Ok(())
    }

    /// Get all confirmed but uncredited deposits
    pub async fn get_pending_credits(&self) -> Vec<PendingDeposit> {
        let pending = self.pending.read().await;
        pending
            .values()
            .filter(|d| d.status == DepositStatus::Confirmed)
            .cloned()
            .collect()
    }

    /// Verify deposit on L1 (would call Solana RPC)
    pub async fn verify_on_l1(&self, l1_tx: Hash) -> Result<bool, DepositError> {
        // TODO: Implement actual L1 verification
        // 1. Fetch transaction from Solana
        // 2. Verify it's a transfer to bridge escrow
        // 3. Extract amount and depositor
        // 4. Verify token mint matches

        Ok(true) // Placeholder
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DepositError {
    #[error("Deposit amount too small")]
    AmountTooSmall,
    #[error("Deposit not found")]
    NotFound,
    #[error("Deposit already processed")]
    AlreadyProcessed,
    #[error("Insufficient L1 confirmations")]
    InsufficientConfirmations,
    #[error("L1 verification failed")]
    VerificationFailed,
}

/// Instructions for users to deposit
pub struct DepositInstructions;

impl DepositInstructions {
    /// Generate deposit instructions for user
    pub fn generate(
        user: &Pubkey,
        amount: TokenAmount,
        bridge_escrow: &Pubkey,
        token_mint: &Pubkey,
    ) -> String {
        format!(
            r#"
To deposit tokens to TaoNet L2:

1. Ensure you have {} TAO tokens in your wallet
2. Send tokens to the bridge escrow: {}
3. Use this memo: "DEPOSIT:{}"
4. Wait for 32 slot confirmations (~12 seconds)
5. Your L2 balance will be credited automatically

Token Mint: {}
Amount: {} (with decimals)
"#,
            amount / 1_000_000_000,
            bridge_escrow,
            user,
            token_mint,
            amount
        )
    }
}
