//! L1 State Sync

use crate::{BridgeConfig, BridgeEvent, BridgeState};
use taonet_runtime::types::*;
use taonet_consensus::poi::PoIBatch;
use sha2::{Digest, Sha256};
use std::collections::VecDeque;
use tokio::sync::RwLock;

/// State commitment to L1
#[derive(Debug, Clone)]
pub struct StateCommitment {
    /// L2 block height
    pub l2_height: BlockHeight,
    /// State root
    pub state_root: Hash,
    /// Proof root (merkle of all PoI proofs)
    pub proof_root: Hash,
    /// L1 slot when committed
    pub l1_slot: L1Slot,
    /// L1 transaction hash
    pub l1_tx: Option<Hash>,
    /// Commitment status
    pub status: CommitmentStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommitmentStatus {
    Pending,
    Submitted,
    Confirmed,
    Challenged,
    Finalized,
}

/// State synchronizer
pub struct StateSynchronizer {
    config: BridgeConfig,
    /// Pending commitments
    pending_commitments: RwLock<VecDeque<StateCommitment>>,
    /// Confirmed commitments
    confirmed: RwLock<Vec<StateCommitment>>,
    /// Latest finalized L2 height
    finalized_height: RwLock<BlockHeight>,
}

impl StateSynchronizer {
    pub fn new(config: BridgeConfig) -> Self {
        Self {
            config,
            pending_commitments: RwLock::new(VecDeque::new()),
            confirmed: RwLock::new(Vec::new()),
            finalized_height: RwLock::new(0),
        }
    }

    /// Queue state commitment for L1
    pub async fn queue_commitment(
        &self,
        l2_height: BlockHeight,
        state_root: Hash,
        proof_root: Hash,
    ) -> StateCommitment {
        let commitment = StateCommitment {
            l2_height,
            state_root,
            proof_root,
            l1_slot: 0,
            l1_tx: None,
            status: CommitmentStatus::Pending,
        };

        let mut pending = self.pending_commitments.write().await;
        pending.push_back(commitment.clone());

        commitment
    }

    /// Submit commitment to L1
    pub async fn submit_to_l1(&self, batch: &PoIBatch) -> Result<Hash, SyncError> {
        // Create commitment data
        let mut data = Vec::new();
        data.extend_from_slice(&batch.block_height.to_le_bytes());
        data.extend_from_slice(&batch.state_root);
        data.extend_from_slice(&batch.merkle_root);
        data.extend_from_slice(&(batch.proofs.len() as u32).to_le_bytes());

        // TODO: Actually submit to Solana
        // 1. Create instruction for bridge program
        // 2. Sign with sequencer key
        // 3. Submit transaction
        // 4. Wait for confirmation

        // Placeholder tx hash
        let tx_hash: Hash = {
            let mut hasher = Sha256::new();
            hasher.update(&data);
            hasher.finalize().into()
        };

        // Update commitment status
        let mut pending = self.pending_commitments.write().await;
        if let Some(commitment) = pending.front_mut() {
            commitment.status = CommitmentStatus::Submitted;
            commitment.l1_tx = Some(tx_hash);
        }

        tracing::info!(
            "Submitted state commitment to L1: height={}, tx={:?}",
            batch.block_height,
            hex::encode(&tx_hash[..8])
        );

        Ok(tx_hash)
    }

    /// Confirm commitment on L1
    pub async fn confirm_commitment(&self, l1_tx: Hash) -> Result<(), SyncError> {
        let mut pending = self.pending_commitments.write().await;
        let mut confirmed = self.confirmed.write().await;

        // Find and update commitment
        if let Some(pos) = pending.iter().position(|c| c.l1_tx == Some(l1_tx)) {
            let mut commitment = pending.remove(pos).unwrap();
            commitment.status = CommitmentStatus::Confirmed;
            confirmed.push(commitment);
        }

        Ok(())
    }

    /// Finalize commitment after challenge period
    pub async fn finalize_commitment(
        &self,
        l2_height: BlockHeight,
        current_l1_slot: L1Slot,
    ) -> Result<BridgeEvent, SyncError> {
        let mut confirmed = self.confirmed.write().await;

        let commitment = confirmed
            .iter_mut()
            .find(|c| c.l2_height == l2_height)
            .ok_or(SyncError::CommitmentNotFound)?;

        // Check challenge period expired
        let slots_passed = current_l1_slot.saturating_sub(commitment.l1_slot);
        if slots_passed < self.config.challenge_period_slots {
            return Err(SyncError::ChallengePeriodActive);
        }

        commitment.status = CommitmentStatus::Finalized;

        // Update finalized height
        let mut finalized = self.finalized_height.write().await;
        if l2_height > *finalized {
            *finalized = l2_height;
        }

        Ok(BridgeEvent::StateRootUpdated {
            l2_height,
            state_root: commitment.state_root,
            proof_root: commitment.proof_root,
        })
    }

    /// Get latest finalized height
    pub async fn get_finalized_height(&self) -> BlockHeight {
        *self.finalized_height.read().await
    }

    /// Handle fraud proof challenge
    pub async fn handle_challenge(
        &self,
        l2_height: BlockHeight,
        challenger: MinerId,
        proof: Vec<u8>,
    ) -> Result<BridgeEvent, SyncError> {
        // Verify the fraud proof
        let is_valid = self.verify_fraud_proof(&proof).await?;

        if !is_valid {
            return Err(SyncError::InvalidFraudProof);
        }

        // Mark commitment as challenged
        let mut confirmed = self.confirmed.write().await;
        if let Some(commitment) = confirmed.iter_mut().find(|c| c.l2_height == l2_height) {
            commitment.status = CommitmentStatus::Challenged;
        }

        Ok(BridgeEvent::FraudProofSubmitted {
            challenger,
            l2_height,
            reason: "State transition invalid".to_string(),
        })
    }

    /// Verify fraud proof
    async fn verify_fraud_proof(&self, _proof: &[u8]) -> Result<bool, SyncError> {
        // TODO: Implement fraud proof verification
        // 1. Decode proof
        // 2. Re-execute disputed state transition
        // 3. Compare with committed state
        // 4. Return true if fraud is proven

        Ok(false) // Conservative: reject invalid proofs
    }

    /// Get sync status
    pub async fn get_status(&self) -> SyncStatus {
        let pending = self.pending_commitments.read().await;
        let confirmed = self.confirmed.read().await;
        let finalized = *self.finalized_height.read().await;

        SyncStatus {
            pending_commitments: pending.len(),
            confirmed_commitments: confirmed.len(),
            finalized_height: finalized,
            latest_submitted: pending.back().map(|c| c.l2_height),
        }
    }
}

#[derive(Debug)]
pub struct SyncStatus {
    pub pending_commitments: usize,
    pub confirmed_commitments: usize,
    pub finalized_height: BlockHeight,
    pub latest_submitted: Option<BlockHeight>,
}

#[derive(Debug, thiserror::Error)]
pub enum SyncError {
    #[error("Commitment not found")]
    CommitmentNotFound,
    #[error("Challenge period still active")]
    ChallengePeriodActive,
    #[error("Invalid fraud proof")]
    InvalidFraudProof,
    #[error("L1 submission failed")]
    L1SubmissionFailed,
}
