//! Proof of Inference (PoI) Consensus
//! 
//! A novel consensus mechanism where miners prove their AI inference capability
//! by completing tasks and having their responses validated.

use taonet_runtime::{
    types::*,
    task::{Task, TaskResponse},
    state::{L2State, MinerAccount},
    inference::{InferenceValidator, ConsensusEngine},
    reward::RewardCalculator,
};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// Proof of Inference consensus
pub struct ProofOfInference {
    /// Validator for responses
    validator: InferenceValidator,
    /// Consensus engine
    consensus: ConsensusEngine,
    /// Reward calculator
    rewards: RewardCalculator,
    /// Minimum miners for consensus
    min_miners: usize,
    /// Timeout for task completion (ms)
    task_timeout_ms: u64,
}

impl Default for ProofOfInference {
    fn default() -> Self {
        Self {
            validator: InferenceValidator::new(),
            consensus: ConsensusEngine::default(),
            rewards: RewardCalculator::new(),
            min_miners: 1,
            task_timeout_ms: 120_000,
        }
    }
}

impl ProofOfInference {
    pub fn new(min_miners: usize) -> Self {
        Self {
            min_miners,
            ..Default::default()
        }
    }

    /// Process a completed task with all responses
    pub fn process_task(
        &self,
        task: &Task,
        responses: &mut [TaskResponse],
        state: &L2State,
    ) -> PoIResult {
        // Step 1: Validate all responses
        self.validator.rank_responses(responses, task.task_type);

        // Step 2: Select winner through consensus
        let winner = self.consensus.select_winner(responses);

        if winner.is_none() {
            return PoIResult {
                task_id: task.id,
                status: PoIStatus::NoValidResponses,
                winner: None,
                rewards: Vec::new(),
                proof: self.generate_proof(task, responses, None),
            };
        }

        let winner = winner.unwrap();

        // Step 3: Calculate rewards
        let miner = state.get_miner(&winner.miner);
        let rewards = if let Some(miner) = miner {
            self.calculate_all_rewards(task, responses, miner)
        } else {
            Vec::new()
        };

        // Step 4: Generate proof
        let proof = self.generate_proof(task, responses, Some(winner));

        PoIResult {
            task_id: task.id,
            status: PoIStatus::Completed,
            winner: Some(winner.miner),
            rewards,
            proof,
        }
    }

    /// Calculate rewards for all valid responders
    fn calculate_all_rewards(
        &self,
        task: &Task,
        responses: &[TaskResponse],
        winner_account: &MinerAccount,
    ) -> Vec<(MinerId, TokenAmount)> {
        let total_pool = task.reward_pool;

        // Use consensus engine's reward distribution
        self.consensus.calculate_rewards(responses, total_pool)
    }

    /// Generate cryptographic proof of the consensus
    fn generate_proof(
        &self,
        task: &Task,
        responses: &[TaskResponse],
        winner: Option<&TaskResponse>,
    ) -> PoIProof {
        let mut hasher = Sha256::new();

        // Include task data
        hasher.update(&task.id);
        hasher.update(&[task.task_type as u8]);

        // Include all responses
        for response in responses {
            hasher.update(&response.miner.to_bytes());
            hasher.update(response.result.as_bytes());
            if let Some(score) = response.score {
                hasher.update(&[score.as_u8()]);
            }
        }

        // Include winner
        if let Some(winner) = winner {
            hasher.update(&winner.miner.to_bytes());
            hasher.update(&winner.score.map(|s| s.as_u8()).unwrap_or(0).to_le_bytes());
        }

        let proof_hash: [u8; 32] = hasher.finalize().into();

        PoIProof {
            task_id: task.id,
            response_count: responses.len() as u8,
            winner_score: winner.and_then(|w| w.score).map(|s| s.as_u8()),
            proof_hash,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// Verify a PoI proof
    pub fn verify_proof(&self, proof: &PoIProof, task: &Task, responses: &[TaskResponse]) -> bool {
        let winner = responses
            .iter()
            .filter(|r| r.score.map(|s| s.as_u8()) == proof.winner_score)
            .next();

        let regenerated = self.generate_proof(task, responses, winner);
        regenerated.proof_hash == proof.proof_hash
    }
}

/// Result of PoI consensus
#[derive(Debug, Clone)]
pub struct PoIResult {
    pub task_id: TaskId,
    pub status: PoIStatus,
    pub winner: Option<MinerId>,
    pub rewards: Vec<(MinerId, TokenAmount)>,
    pub proof: PoIProof,
}

/// Status of PoI process
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PoIStatus {
    Pending,
    InProgress,
    Completed,
    NoValidResponses,
    Timeout,
    Failed,
}

/// Cryptographic proof of inference consensus
#[derive(Debug, Clone)]
pub struct PoIProof {
    /// Task this proof is for
    pub task_id: TaskId,
    /// Number of responses considered
    pub response_count: u8,
    /// Winner's score
    pub winner_score: Option<u8>,
    /// Hash of all inputs
    pub proof_hash: Hash,
    /// When proof was generated
    pub timestamp: i64,
}

impl PoIProof {
    /// Serialize proof for L1 submission
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(75);
        bytes.extend_from_slice(&self.task_id);
        bytes.push(self.response_count);
        bytes.push(self.winner_score.unwrap_or(0));
        bytes.extend_from_slice(&self.proof_hash);
        bytes.extend_from_slice(&self.timestamp.to_le_bytes());
        bytes
    }

    /// Deserialize proof
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 75 {
            return None;
        }

        let mut task_id = [0u8; 32];
        task_id.copy_from_slice(&bytes[0..32]);

        let response_count = bytes[32];
        let winner_score = if bytes[33] > 0 { Some(bytes[33]) } else { None };

        let mut proof_hash = [0u8; 32];
        proof_hash.copy_from_slice(&bytes[34..66]);

        let timestamp = i64::from_le_bytes(bytes[66..74].try_into().ok()?);

        Some(Self {
            task_id,
            response_count,
            winner_score,
            proof_hash,
            timestamp,
        })
    }
}

/// Batch of proofs for L1 submission
#[derive(Debug, Clone)]
pub struct PoIBatch {
    /// L2 block height
    pub block_height: BlockHeight,
    /// All proofs in this batch
    pub proofs: Vec<PoIProof>,
    /// Merkle root of proofs
    pub merkle_root: Hash,
    /// L2 state root after this batch
    pub state_root: Hash,
    /// Sequencer signature
    pub signature: Signature,
}

impl PoIBatch {
    /// Create new batch from proofs
    pub fn new(block_height: BlockHeight, proofs: Vec<PoIProof>, state_root: Hash) -> Self {
        let merkle_root = Self::compute_merkle_root(&proofs);

        Self {
            block_height,
            proofs,
            merkle_root,
            state_root,
            signature: [0u8; 64], // To be signed by sequencer
        }
    }

    /// Compute Merkle root of proofs
    fn compute_merkle_root(proofs: &[PoIProof]) -> Hash {
        if proofs.is_empty() {
            return [0u8; 32];
        }

        let mut hashes: Vec<Hash> = proofs
            .iter()
            .map(|p| {
                let mut hasher = Sha256::new();
                hasher.update(&p.to_bytes());
                hasher.finalize().into()
            })
            .collect();

        while hashes.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in hashes.chunks(2) {
                let mut hasher = Sha256::new();
                hasher.update(&chunk[0]);
                if chunk.len() > 1 {
                    hasher.update(&chunk[1]);
                } else {
                    hasher.update(&chunk[0]); // Duplicate last if odd
                }
                next_level.push(hasher.finalize().into());
            }
            hashes = next_level;
        }

        hashes[0]
    }

    /// Serialize for L1 submission
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&self.block_height.to_le_bytes());
        bytes.extend_from_slice(&(self.proofs.len() as u32).to_le_bytes());
        bytes.extend_from_slice(&self.merkle_root);
        bytes.extend_from_slice(&self.state_root);
        bytes.extend_from_slice(&self.signature);
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::pubkey::Pubkey;

    #[test]
    fn test_poi_basic() {
        let poi = ProofOfInference::default();
        let requester = Pubkey::new_unique();

        let task = Task::new(
            taonet_runtime::types::TaskType::Text,
            "What is AI?".to_string(),
            None,
            requester,
            Difficulty::Easy,
            10_000_000_000,
            1234567890000,
            1,
        );

        let mut responses = vec![TaskResponse::new(
            task.id,
            Pubkey::new_unique(),
            "AI is artificial intelligence...".to_string(),
            5000,
            1234567890001,
            [0u8; 64],
        )];

        let state = L2State::new();
        let result = poi.process_task(&task, &mut responses, &state);

        assert!(matches!(
            result.status,
            PoIStatus::Completed | PoIStatus::NoValidResponses
        ));
    }
}
