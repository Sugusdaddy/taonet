//! Withdrawal handling - L2 -> L1

use crate::{BridgeConfig, BridgeEvent};
use taonet_runtime::types::*;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tokio::sync::RwLock;

/// Withdrawal request
#[derive(Debug, Clone)]
pub struct WithdrawalRequest {
    /// Unique withdrawal ID
    pub id: Hash,
    /// User requesting withdrawal
    pub user: MinerId,
    /// Amount to withdraw
    pub amount: TokenAmount,
    /// L2 block when requested
    pub request_block: BlockHeight,
    /// L2 block when unlocked
    pub unlock_block: BlockHeight,
    /// Status
    pub status: WithdrawalStatus,
    /// Proof of inclusion in L2 state
    pub merkle_proof: Option<Vec<Hash>>,
    /// L1 transaction hash (when completed)
    pub l1_tx: Option<Hash>,
    /// Created timestamp
    pub created_at: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WithdrawalStatus {
    /// Pending unlock period
    Pending,
    /// Ready to be claimed on L1
    Ready,
    /// Challenge period active
    Challenged,
    /// Completed on L1
    Completed,
    /// Failed/Rejected
    Failed,
}

/// Withdrawal handler
pub struct WithdrawalHandler {
    config: BridgeConfig,
    /// Pending withdrawals by ID
    pending: RwLock<HashMap<Hash, WithdrawalRequest>>,
    /// User's pending withdrawals
    by_user: RwLock<HashMap<MinerId, Vec<Hash>>>,
}

impl WithdrawalHandler {
    pub fn new(config: BridgeConfig) -> Self {
        Self {
            config,
            pending: RwLock::new(HashMap::new()),
            by_user: RwLock::new(HashMap::new()),
        }
    }

    /// Initiate withdrawal request
    pub async fn initiate(
        &self,
        user: MinerId,
        amount: TokenAmount,
        current_block: BlockHeight,
    ) -> Result<(Hash, BridgeEvent), WithdrawalError> {
        // Validate amount
        if amount < self.config.min_withdrawal {
            return Err(WithdrawalError::AmountTooSmall);
        }

        // Generate unique ID
        let id = self.generate_withdrawal_id(&user, amount, current_block);
        let unlock_block = current_block + self.config.withdrawal_delay_blocks;

        let request = WithdrawalRequest {
            id,
            user,
            amount,
            request_block: current_block,
            unlock_block,
            status: WithdrawalStatus::Pending,
            merkle_proof: None,
            l1_tx: None,
            created_at: chrono::Utc::now().timestamp_millis(),
        };

        // Store
        let mut pending = self.pending.write().await;
        let mut by_user = self.by_user.write().await;

        pending.insert(id, request);
        by_user.entry(user).or_default().push(id);

        let event = BridgeEvent::WithdrawalInitiated {
            user,
            amount,
            l2_block: current_block,
            unlock_block,
        };

        Ok((id, event))
    }

    /// Generate unique withdrawal ID
    fn generate_withdrawal_id(
        &self,
        user: &MinerId,
        amount: TokenAmount,
        block: BlockHeight,
    ) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(user.as_ref());
        hasher.update(&amount.to_le_bytes());
        hasher.update(&block.to_le_bytes());
        hasher.update(&chrono::Utc::now().timestamp_millis().to_le_bytes());
        hasher.finalize().into()
    }

    /// Check if withdrawal is ready
    pub async fn check_ready(
        &self,
        withdrawal_id: Hash,
        current_block: BlockHeight,
    ) -> Result<bool, WithdrawalError> {
        let pending = self.pending.read().await;
        let request = pending.get(&withdrawal_id).ok_or(WithdrawalError::NotFound)?;

        Ok(current_block >= request.unlock_block && request.status == WithdrawalStatus::Pending)
    }

    /// Mark withdrawal as ready
    pub async fn mark_ready(&self, withdrawal_id: Hash) -> Result<(), WithdrawalError> {
        let mut pending = self.pending.write().await;
        let request = pending.get_mut(&withdrawal_id).ok_or(WithdrawalError::NotFound)?;

        if request.status != WithdrawalStatus::Pending {
            return Err(WithdrawalError::InvalidStatus);
        }

        request.status = WithdrawalStatus::Ready;
        Ok(())
    }

    /// Attach merkle proof for L1 claim
    pub async fn attach_proof(
        &self,
        withdrawal_id: Hash,
        proof: Vec<Hash>,
    ) -> Result<(), WithdrawalError> {
        let mut pending = self.pending.write().await;
        let request = pending.get_mut(&withdrawal_id).ok_or(WithdrawalError::NotFound)?;

        request.merkle_proof = Some(proof);
        Ok(())
    }

    /// Complete withdrawal (called after L1 confirmation)
    pub async fn complete(
        &self,
        withdrawal_id: Hash,
        l1_tx: Hash,
    ) -> Result<BridgeEvent, WithdrawalError> {
        let mut pending = self.pending.write().await;
        let request = pending.get_mut(&withdrawal_id).ok_or(WithdrawalError::NotFound)?;

        if request.status != WithdrawalStatus::Ready {
            return Err(WithdrawalError::InvalidStatus);
        }

        request.status = WithdrawalStatus::Completed;
        request.l1_tx = Some(l1_tx);

        Ok(BridgeEvent::WithdrawalCompleted {
            user: request.user,
            amount: request.amount,
            l1_tx,
        })
    }

    /// Challenge a withdrawal (fraud proof)
    pub async fn challenge(
        &self,
        withdrawal_id: Hash,
        _challenger: MinerId,
        _proof: Vec<u8>,
    ) -> Result<(), WithdrawalError> {
        let mut pending = self.pending.write().await;
        let request = pending.get_mut(&withdrawal_id).ok_or(WithdrawalError::NotFound)?;

        if request.status != WithdrawalStatus::Ready {
            return Err(WithdrawalError::InvalidStatus);
        }

        // TODO: Verify fraud proof
        request.status = WithdrawalStatus::Challenged;

        Ok(())
    }

    /// Get all ready withdrawals
    pub async fn get_ready_withdrawals(&self) -> Vec<WithdrawalRequest> {
        let pending = self.pending.read().await;
        pending
            .values()
            .filter(|w| w.status == WithdrawalStatus::Ready)
            .cloned()
            .collect()
    }

    /// Get user's withdrawals
    pub async fn get_user_withdrawals(&self, user: &MinerId) -> Vec<WithdrawalRequest> {
        let pending = self.pending.read().await;
        let by_user = self.by_user.read().await;

        by_user
            .get(user)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| pending.get(id).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum WithdrawalError {
    #[error("Withdrawal amount too small")]
    AmountTooSmall,
    #[error("Withdrawal not found")]
    NotFound,
    #[error("Invalid withdrawal status")]
    InvalidStatus,
    #[error("Insufficient L2 balance")]
    InsufficientBalance,
    #[error("Challenge period not expired")]
    ChallengePeriodActive,
}

/// Withdrawal proof for L1 claim
#[derive(Debug, Clone)]
pub struct WithdrawalProof {
    pub withdrawal_id: Hash,
    pub user: MinerId,
    pub amount: TokenAmount,
    pub l2_block: BlockHeight,
    pub state_root: Hash,
    pub merkle_proof: Vec<Hash>,
}

impl WithdrawalProof {
    /// Serialize for L1 submission
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&self.withdrawal_id);
        bytes.extend_from_slice(self.user.as_ref());
        bytes.extend_from_slice(&self.amount.to_le_bytes());
        bytes.extend_from_slice(&self.l2_block.to_le_bytes());
        bytes.extend_from_slice(&self.state_root);
        bytes.extend_from_slice(&(self.merkle_proof.len() as u32).to_le_bytes());
        for hash in &self.merkle_proof {
            bytes.extend_from_slice(hash);
        }
        bytes
    }

    /// Verify merkle proof
    pub fn verify(&self) -> bool {
        // TODO: Implement proper merkle verification
        !self.merkle_proof.is_empty()
    }
}
