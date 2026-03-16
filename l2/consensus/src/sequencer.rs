//! Sequencer - Block producer for L2

use taonet_runtime::{
    types::*,
    state::L2State,
    task::{Task, TaskResponse, TaskQueue},
};
use crate::block::{Block, Transaction};
use crate::poi::{ProofOfInference, PoIProof, PoIBatch};
use crate::miner_selection::MinerSelector;
use std::collections::{HashMap, VecDeque};
use tokio::sync::RwLock;
use std::sync::Arc;

/// Sequencer configuration
#[derive(Debug, Clone)]
pub struct SequencerConfig {
    /// Target block time in milliseconds
    pub block_time_ms: u64,
    /// Maximum transactions per block
    pub max_txs_per_block: usize,
    /// Maximum proofs per block
    pub max_proofs_per_block: usize,
    /// L1 batch interval (in blocks)
    pub l1_batch_interval: u64,
}

impl Default for SequencerConfig {
    fn default() -> Self {
        Self {
            block_time_ms: 1000,        // 1 second blocks
            max_txs_per_block: 1000,
            max_proofs_per_block: 100,
            l1_batch_interval: 100,     // Batch to L1 every 100 blocks
        }
    }
}

/// Sequencer - produces L2 blocks
pub struct Sequencer {
    /// Configuration
    config: SequencerConfig,
    /// Sequencer's identity
    identity: MinerId,
    /// L2 state
    state: Arc<RwLock<L2State>>,
    /// Transaction mempool
    mempool: Arc<RwLock<VecDeque<Transaction>>>,
    /// Task queue
    task_queue: Arc<RwLock<TaskQueue>>,
    /// Pending proofs
    pending_proofs: Arc<RwLock<Vec<PoIProof>>>,
    /// PoI consensus
    poi: ProofOfInference,
    /// Miner selector
    miner_selector: MinerSelector,
    /// Current assignments
    current_assignments: Arc<RwLock<HashMap<MinerId, usize>>>,
    /// Chain of blocks
    chain: Arc<RwLock<Vec<Block>>>,
    /// Running flag
    is_running: Arc<RwLock<bool>>,
}

impl Sequencer {
    pub fn new(
        identity: MinerId,
        config: SequencerConfig,
        genesis_state: L2State,
    ) -> Self {
        Self {
            config,
            identity,
            state: Arc::new(RwLock::new(genesis_state)),
            mempool: Arc::new(RwLock::new(VecDeque::new())),
            task_queue: Arc::new(RwLock::new(TaskQueue::new())),
            pending_proofs: Arc::new(RwLock::new(Vec::new())),
            poi: ProofOfInference::default(),
            miner_selector: MinerSelector::default(),
            current_assignments: Arc::new(RwLock::new(HashMap::new())),
            chain: Arc::new(RwLock::new(Vec::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start sequencer loop
    pub async fn start(&self) {
        {
            let mut running = self.is_running.write().await;
            *running = true;
        }

        tracing::info!("Sequencer started");

        while *self.is_running.read().await {
            let start = std::time::Instant::now();

            // Produce block
            if let Err(e) = self.produce_block().await {
                tracing::error!("Block production failed: {}", e);
            }

            // Sleep for remaining block time
            let elapsed = start.elapsed().as_millis() as u64;
            if elapsed < self.config.block_time_ms {
                tokio::time::sleep(tokio::time::Duration::from_millis(
                    self.config.block_time_ms - elapsed,
                ))
                .await;
            }
        }
    }

    /// Stop sequencer
    pub async fn stop(&self) {
        let mut running = self.is_running.write().await;
        *running = false;
        tracing::info!("Sequencer stopped");
    }

    /// Produce a new block
    async fn produce_block(&self) -> anyhow::Result<Block> {
        let mut state = self.state.write().await;
        let mut mempool = self.mempool.write().await;
        let mut proofs = self.pending_proofs.write().await;
        let mut chain = self.chain.write().await;

        // Get transactions from mempool
        let txs: Vec<_> = mempool
            .drain(..self.config.max_txs_per_block.min(mempool.len()))
            .collect();

        // Get proofs
        let block_proofs: Vec<_> = proofs
            .drain(..self.config.max_proofs_per_block.min(proofs.len()))
            .collect();

        // Calculate previous hash
        let prev_hash = chain.last().map(|b| b.hash()).unwrap_or([0u8; 32]);

        // Update state with transactions
        for tx in &txs {
            self.apply_transaction(&mut state, tx).await?;
        }

        // Compute new state root
        let state_root = state.compute_state_root();
        let height = state.block_height + 1;
        state.block_height = height;

        // Create block
        let timestamp = chrono::Utc::now().timestamp_millis();
        let block = Block::new(
            height,
            prev_hash,
            txs,
            block_proofs,
            state_root,
            self.identity,
            timestamp,
        );

        // TODO: Sign block

        chain.push(block.clone());

        tracing::debug!(
            "Block {} produced: {} txs, {} proofs",
            height,
            block.transactions.len(),
            block.proofs.len()
        );

        // Check if we need to batch to L1
        if height % self.config.l1_batch_interval == 0 {
            self.batch_to_l1(height, state_root).await?;
        }

        Ok(block)
    }

    /// Apply transaction to state
    async fn apply_transaction(
        &self,
        state: &mut L2State,
        tx: &Transaction,
    ) -> anyhow::Result<()> {
        match tx {
            Transaction::RegisterMiner { address, name, .. } => {
                let timestamp = chrono::Utc::now().timestamp_millis();
                state.register_miner(*address, name.clone(), timestamp)?;
            }
            Transaction::Stake { miner, amount, .. } => {
                if let Some(account) = state.get_miner_mut(miner) {
                    account.stake(*amount);
                    state.total_supply += amount;
                }
            }
            Transaction::Unstake { miner, amount } => {
                if let Some(account) = state.get_miner_mut(miner) {
                    account.unstake(*amount)?;
                }
            }
            Transaction::SubmitTask { requester, task_type, reward_pool, .. } => {
                let task = Task::new(
                    *task_type,
                    String::new(), // Prompt stored off-chain
                    None,
                    *requester,
                    Difficulty::Medium,
                    *reward_pool,
                    chrono::Utc::now().timestamp_millis(),
                    state.block_height,
                );
                state.submit_task(task)?;
            }
            Transaction::ClaimRewards { miner, .. } => {
                if let Some(account) = state.get_miner_mut(miner) {
                    let amount = account.withdraw();
                    // In production, would initiate L1 withdrawal
                    tracing::info!("Miner {} claimed {} tokens", miner, amount);
                }
            }
            _ => {}
        }

        Ok(())
    }

    /// Submit transaction to mempool
    pub async fn submit_transaction(&self, tx: Transaction) -> anyhow::Result<Hash> {
        let hash = tx.hash();
        let mut mempool = self.mempool.write().await;
        mempool.push_back(tx);
        Ok(hash)
    }

    /// Add proof to pending
    pub async fn add_proof(&self, proof: PoIProof) {
        let mut proofs = self.pending_proofs.write().await;
        proofs.push(proof);
    }

    /// Batch proofs to L1
    async fn batch_to_l1(&self, block_height: BlockHeight, state_root: Hash) -> anyhow::Result<()> {
        let chain = self.chain.read().await;

        // Collect proofs from recent blocks
        let start = block_height.saturating_sub(self.config.l1_batch_interval);
        let proofs: Vec<_> = chain
            .iter()
            .filter(|b| b.header.height > start && b.header.height <= block_height)
            .flat_map(|b| b.proofs.clone())
            .collect();

        if proofs.is_empty() {
            return Ok(());
        }

        let batch = PoIBatch::new(block_height, proofs, state_root);

        // TODO: Submit batch to Solana L1
        tracing::info!(
            "Batching {} proofs to L1 at height {}",
            batch.proofs.len(),
            block_height
        );

        Ok(())
    }

    /// Get current state
    pub async fn get_state(&self) -> L2State {
        self.state.read().await.clone()
    }

    /// Get block by height
    pub async fn get_block(&self, height: BlockHeight) -> Option<Block> {
        let chain = self.chain.read().await;
        chain.get(height as usize).cloned()
    }

    /// Get latest block
    pub async fn get_latest_block(&self) -> Option<Block> {
        let chain = self.chain.read().await;
        chain.last().cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sequencer_creation() {
        let identity = solana_sdk::pubkey::Pubkey::new_unique();
        let config = SequencerConfig::default();
        let state = L2State::new();

        let sequencer = Sequencer::new(identity, config, state);

        let current_state = sequencer.get_state().await;
        assert_eq!(current_state.block_height, 0);
    }
}
