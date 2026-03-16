//! Main node implementation

use crate::config::NodeConfig;
use taonet_runtime::state::L2State;
use taonet_consensus::sequencer::{Sequencer, SequencerConfig as SeqConfig};
use taonet_bridge::{BridgeConfig, DepositHandler, WithdrawalHandler, StateSynchronizer};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;
use tokio::sync::RwLock;

/// TaoNet L2 Node
pub struct TaoNetNode {
    config: NodeConfig,
    state: Arc<RwLock<L2State>>,
    identity: Pubkey,
    sequencer: Option<Sequencer>,
    deposit_handler: Arc<DepositHandler>,
    withdrawal_handler: Arc<WithdrawalHandler>,
    state_sync: Arc<StateSynchronizer>,
}

impl TaoNetNode {
    /// Create new node
    pub async fn new(config: NodeConfig) -> anyhow::Result<Self> {
        // Load identity
        let keypair_bytes: Vec<u8> = serde_json::from_str(
            &std::fs::read_to_string(&config.identity.keypair_path)?
        )?;
        let keypair = solana_sdk::signer::keypair::Keypair::from_bytes(&keypair_bytes)?;
        let identity = keypair.pubkey();

        tracing::info!("Node identity: {}", identity);

        // Initialize state
        let state = Arc::new(RwLock::new(L2State::new()));

        // Initialize bridge components
        let bridge_config = BridgeConfig {
            solana_rpc: config.bridge.solana_rpc.clone(),
            bridge_program_id: Pubkey::from_str(&config.bridge.bridge_program)
                .unwrap_or_default(),
            token_mint: Pubkey::from_str(&config.bridge.token_mint)
                .unwrap_or_default(),
            ..Default::default()
        };

        let deposit_handler = Arc::new(DepositHandler::new(bridge_config.clone()));
        let withdrawal_handler = Arc::new(WithdrawalHandler::new(bridge_config.clone()));
        let state_sync = Arc::new(StateSynchronizer::new(bridge_config));

        // Initialize sequencer if configured
        let sequencer = if let Some(seq_config) = &config.sequencer {
            let seq_cfg = SeqConfig {
                block_time_ms: seq_config.block_time_ms,
                max_txs_per_block: seq_config.max_txs_per_block,
                l1_batch_interval: seq_config.l1_batch_interval,
                ..Default::default()
            };
            Some(Sequencer::new(identity, seq_cfg, L2State::new()))
        } else {
            None
        };

        Ok(Self {
            config,
            state,
            identity,
            sequencer,
            deposit_handler,
            withdrawal_handler,
            state_sync,
        })
    }

    /// Run as sequencer
    pub async fn run_sequencer(&self) -> anyhow::Result<()> {
        tracing::info!("Starting sequencer mode");

        let sequencer = self.sequencer.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Sequencer not configured"))?;

        // Start RPC server
        let rpc_handle = self.start_rpc_server().await?;

        // Start sequencer
        sequencer.start().await;

        // Wait for shutdown
        tokio::signal::ctrl_c().await?;
        
        tracing::info!("Shutting down...");
        sequencer.stop().await;

        Ok(())
    }

    /// Run as validator
    pub async fn run_validator(&self) -> anyhow::Result<()> {
        tracing::info!("Starting validator mode");

        // Start RPC server
        let rpc_handle = self.start_rpc_server().await?;

        // Connect to network
        self.connect_to_network().await?;

        // Sync state
        self.sync_state().await?;

        // Start validation loop
        self.validation_loop().await?;

        Ok(())
    }

    /// Start RPC server
    async fn start_rpc_server(&self) -> anyhow::Result<tokio::task::JoinHandle<()>> {
        let addr = self.config.rpc.listen_addr.clone();
        let state = self.state.clone();

        let handle = tokio::spawn(async move {
            tracing::info!("RPC server listening on {}", addr);
            // TODO: Start actual RPC server
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            }
        });

        Ok(handle)
    }

    /// Connect to P2P network
    async fn connect_to_network(&self) -> anyhow::Result<()> {
        tracing::info!("Connecting to network...");

        for peer in &self.config.network.bootstrap_peers {
            tracing::debug!("Connecting to bootstrap peer: {}", peer);
            // TODO: Implement P2P connection
        }

        tracing::info!("Connected to {} peers", self.config.network.bootstrap_peers.len());
        Ok(())
    }

    /// Sync state from network
    async fn sync_state(&self) -> anyhow::Result<()> {
        tracing::info!("Syncing state...");

        // TODO: Implement state sync
        // 1. Get latest finalized state from L1
        // 2. Download blocks from peers
        // 3. Verify and apply blocks

        tracing::info!("State synced");
        Ok(())
    }

    /// Main validation loop
    async fn validation_loop(&self) -> anyhow::Result<()> {
        tracing::info!("Starting validation loop");

        loop {
            // Receive new blocks
            // Validate transactions
            // Verify PoI proofs
            // Update local state

            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    }

    /// Get current state
    pub async fn get_state(&self) -> L2State {
        self.state.read().await.clone()
    }

    /// Get node info
    pub fn get_info(&self) -> NodeInfo {
        NodeInfo {
            identity: self.identity.to_string(),
            name: self.config.identity.name.clone(),
            network: self.config.network.network.clone(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct NodeInfo {
    pub identity: String,
    pub name: String,
    pub network: String,
    pub version: String,
}
