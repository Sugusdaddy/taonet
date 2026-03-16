//! Node configuration

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;

/// Node configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    /// Node identity
    pub identity: IdentityConfig,
    /// Network settings
    pub network: NetworkConfig,
    /// L1 bridge settings
    pub bridge: BridgeConfig,
    /// RPC server settings
    pub rpc: RpcConfig,
    /// Storage settings
    pub storage: StorageConfig,
    /// Sequencer settings (only if running as sequencer)
    pub sequencer: Option<SequencerConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityConfig {
    /// Path to keypair file
    pub keypair_path: String,
    /// Node name
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Network name (mainnet, testnet, devnet)
    pub network: String,
    /// Listen address
    pub listen_addr: String,
    /// Bootstrap peers
    pub bootstrap_peers: Vec<String>,
    /// Maximum peers
    pub max_peers: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeConfig {
    /// Solana RPC URL
    pub solana_rpc: String,
    /// Bridge program ID
    pub bridge_program: String,
    /// Token mint address
    pub token_mint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcConfig {
    /// RPC listen address
    pub listen_addr: String,
    /// Enable WebSocket
    pub websocket: bool,
    /// Max connections
    pub max_connections: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    /// Data directory
    pub data_dir: String,
    /// RocksDB cache size (MB)
    pub cache_size_mb: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequencerConfig {
    /// Block time in milliseconds
    pub block_time_ms: u64,
    /// Max transactions per block
    pub max_txs_per_block: usize,
    /// L1 batch interval (in L2 blocks)
    pub l1_batch_interval: u64,
}

impl NodeConfig {
    /// Load config from file
    pub fn load(path: &str) -> anyhow::Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: Self = toml::from_str(&content)?;
        Ok(config)
    }

    /// Save config to file
    pub fn save(&self, path: &str) -> anyhow::Result<()> {
        let content = toml::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }

    /// Initialize new config
    pub fn init(output_dir: &str, network: &str) -> anyhow::Result<()> {
        let path = Path::new(output_dir);
        fs::create_dir_all(path)?;

        let (solana_rpc, bootstrap) = match network {
            "mainnet" => (
                "https://api.mainnet-beta.solana.com",
                vec!["taonet-bootstrap.mainnet.io:9000".to_string()],
            ),
            "testnet" => (
                "https://api.testnet.solana.com",
                vec!["taonet-bootstrap.testnet.io:9000".to_string()],
            ),
            _ => (
                "https://api.devnet.solana.com",
                vec!["127.0.0.1:9000".to_string()],
            ),
        };

        let config = NodeConfig {
            identity: IdentityConfig {
                keypair_path: path.join("identity.json").to_string_lossy().to_string(),
                name: "taonet-node".to_string(),
            },
            network: NetworkConfig {
                network: network.to_string(),
                listen_addr: "0.0.0.0:9000".to_string(),
                bootstrap_peers: bootstrap,
                max_peers: 50,
            },
            bridge: BridgeConfig {
                solana_rpc: solana_rpc.to_string(),
                bridge_program: "11111111111111111111111111111111".to_string(),
                token_mint: "11111111111111111111111111111111".to_string(),
            },
            rpc: RpcConfig {
                listen_addr: "0.0.0.0:8899".to_string(),
                websocket: true,
                max_connections: 1000,
            },
            storage: StorageConfig {
                data_dir: path.join("data").to_string_lossy().to_string(),
                cache_size_mb: 512,
            },
            sequencer: None,
        };

        config.save(&path.join("config.toml").to_string_lossy())?;

        // Generate identity keypair
        let keypair = solana_sdk::signer::keypair::Keypair::new();
        let keypair_bytes = keypair.to_bytes();
        fs::write(
            path.join("identity.json"),
            serde_json::to_string(&keypair_bytes.to_vec())?,
        )?;

        tracing::info!("Generated identity: {}", keypair.pubkey());

        Ok(())
    }
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            identity: IdentityConfig {
                keypair_path: "identity.json".to_string(),
                name: "taonet-node".to_string(),
            },
            network: NetworkConfig {
                network: "devnet".to_string(),
                listen_addr: "0.0.0.0:9000".to_string(),
                bootstrap_peers: Vec::new(),
                max_peers: 50,
            },
            bridge: BridgeConfig {
                solana_rpc: "https://api.devnet.solana.com".to_string(),
                bridge_program: "11111111111111111111111111111111".to_string(),
                token_mint: "11111111111111111111111111111111".to_string(),
            },
            rpc: RpcConfig {
                listen_addr: "0.0.0.0:8899".to_string(),
                websocket: true,
                max_connections: 1000,
            },
            storage: StorageConfig {
                data_dir: "data".to_string(),
                cache_size_mb: 512,
            },
            sequencer: None,
        }
    }
}
