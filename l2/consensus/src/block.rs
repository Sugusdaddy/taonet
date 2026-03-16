//! L2 Block structure

use taonet_runtime::types::*;
use crate::poi::PoIProof;
use sha2::{Digest, Sha256};
use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};

/// L2 Block
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct Block {
    /// Block header
    pub header: BlockHeader,
    /// Transactions in this block
    pub transactions: Vec<Transaction>,
    /// PoI proofs for completed tasks
    pub proofs: Vec<PoIProof>,
}

/// Block header
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct BlockHeader {
    /// Block height
    pub height: BlockHeight,
    /// Previous block hash
    pub prev_hash: Hash,
    /// State root after this block
    pub state_root: Hash,
    /// Merkle root of transactions
    pub tx_root: Hash,
    /// Merkle root of proofs
    pub proof_root: Hash,
    /// Block timestamp
    pub timestamp: Timestamp,
    /// Sequencer who created this block
    pub sequencer: MinerId,
    /// Sequencer signature
    pub signature: Signature,
}

impl Block {
    /// Create new block
    pub fn new(
        height: BlockHeight,
        prev_hash: Hash,
        transactions: Vec<Transaction>,
        proofs: Vec<PoIProof>,
        state_root: Hash,
        sequencer: MinerId,
        timestamp: Timestamp,
    ) -> Self {
        let tx_root = Self::compute_tx_root(&transactions);
        let proof_root = Self::compute_proof_root(&proofs);

        let header = BlockHeader {
            height,
            prev_hash,
            state_root,
            tx_root,
            proof_root,
            timestamp,
            sequencer,
            signature: [0u8; 64], // To be signed
        };

        Self {
            header,
            transactions,
            proofs,
        }
    }

    /// Compute block hash
    pub fn hash(&self) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(&self.header.height.to_le_bytes());
        hasher.update(&self.header.prev_hash);
        hasher.update(&self.header.state_root);
        hasher.update(&self.header.tx_root);
        hasher.update(&self.header.proof_root);
        hasher.update(&self.header.timestamp.to_le_bytes());
        hasher.update(self.header.sequencer.as_ref());
        hasher.finalize().into()
    }

    /// Compute transaction merkle root
    fn compute_tx_root(transactions: &[Transaction]) -> Hash {
        if transactions.is_empty() {
            return [0u8; 32];
        }

        let hashes: Vec<Hash> = transactions.iter().map(|tx| tx.hash()).collect();
        Self::merkle_root(&hashes)
    }

    /// Compute proof merkle root
    fn compute_proof_root(proofs: &[PoIProof]) -> Hash {
        if proofs.is_empty() {
            return [0u8; 32];
        }

        let hashes: Vec<Hash> = proofs
            .iter()
            .map(|p| {
                let mut hasher = Sha256::new();
                hasher.update(&p.to_bytes());
                hasher.finalize().into()
            })
            .collect();

        Self::merkle_root(&hashes)
    }

    /// Compute merkle root from hashes
    fn merkle_root(hashes: &[Hash]) -> Hash {
        if hashes.is_empty() {
            return [0u8; 32];
        }
        if hashes.len() == 1 {
            return hashes[0];
        }

        let mut current = hashes.to_vec();
        while current.len() > 1 {
            let mut next = Vec::new();
            for chunk in current.chunks(2) {
                let mut hasher = Sha256::new();
                hasher.update(&chunk[0]);
                hasher.update(chunk.get(1).unwrap_or(&chunk[0]));
                next.push(hasher.finalize().into());
            }
            current = next;
        }
        current[0]
    }

    /// Verify block integrity
    pub fn verify(&self) -> bool {
        // Verify transaction root
        let computed_tx_root = Self::compute_tx_root(&self.transactions);
        if computed_tx_root != self.header.tx_root {
            return false;
        }

        // Verify proof root
        let computed_proof_root = Self::compute_proof_root(&self.proofs);
        if computed_proof_root != self.header.proof_root {
            return false;
        }

        // TODO: Verify signature

        true
    }
}

/// Transaction types in L2
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum Transaction {
    /// Register new miner
    RegisterMiner {
        address: MinerId,
        name: String,
        signature: Signature,
    },
    /// Stake tokens
    Stake {
        miner: MinerId,
        amount: TokenAmount,
        l1_tx: Hash, // Reference to L1 deposit tx
    },
    /// Unstake tokens (initiates withdrawal)
    Unstake {
        miner: MinerId,
        amount: TokenAmount,
    },
    /// Submit task
    SubmitTask {
        requester: MinerId,
        task_type: TaskType,
        prompt_hash: Hash, // Hash of prompt (full prompt stored off-chain)
        reward_pool: TokenAmount,
    },
    /// Submit response
    SubmitResponse {
        task_id: TaskId,
        miner: MinerId,
        result_hash: Hash, // Hash of result
        processing_time_ms: u64,
        signature: Signature,
    },
    /// Claim rewards
    ClaimRewards {
        miner: MinerId,
        signature: Signature,
    },
    /// Update miner capabilities
    UpdateCapabilities {
        miner: MinerId,
        capabilities: Vec<TaskType>,
        signature: Signature,
    },
    /// Slash miner (penalty)
    Slash {
        miner: MinerId,
        reason: SlashReason,
        amount: TokenAmount,
    },
}

impl Transaction {
    /// Compute transaction hash
    pub fn hash(&self) -> Hash {
        let serialized = borsh::to_vec(self).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(&serialized);
        hasher.finalize().into()
    }
}

/// Reasons for slashing
#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub enum SlashReason {
    TaskTimeout,
    InvalidResponse,
    MaliciousBehavior,
    DowntimeExceeded,
}

/// Genesis block configuration
#[derive(Debug, Clone)]
pub struct GenesisConfig {
    pub timestamp: Timestamp,
    pub initial_treasury: TokenAmount,
    pub initial_miners: Vec<(MinerId, String, TokenAmount)>,
}

impl GenesisConfig {
    /// Create genesis block
    pub fn create_genesis_block(&self) -> Block {
        Block::new(
            0,
            [0u8; 32],
            Vec::new(),
            Vec::new(),
            [0u8; 32],
            self.initial_miners.first().map(|(id, _, _)| *id).unwrap_or(MinerId::default()),
            self.timestamp,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::pubkey::Pubkey;

    #[test]
    fn test_block_creation() {
        let sequencer = Pubkey::new_unique();
        let block = Block::new(
            1,
            [0u8; 32],
            Vec::new(),
            Vec::new(),
            [0u8; 32],
            sequencer,
            1234567890000,
        );

        assert_eq!(block.header.height, 1);
        assert!(block.verify());
    }

    #[test]
    fn test_block_hash_deterministic() {
        let sequencer = Pubkey::new_unique();
        let block1 = Block::new(1, [0u8; 32], Vec::new(), Vec::new(), [0u8; 32], sequencer, 1234567890000);
        let block2 = Block::new(1, [0u8; 32], Vec::new(), Vec::new(), [0u8; 32], sequencer, 1234567890000);

        assert_eq!(block1.hash(), block2.hash());
    }
}
