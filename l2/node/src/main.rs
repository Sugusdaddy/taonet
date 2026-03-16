//! TaoNet L2 Node

use clap::{Parser, Subcommand};
use tracing_subscriber;

mod config;
mod node;
mod rpc;
mod storage;

pub use config::*;
pub use node::*;
pub use rpc::*;
pub use storage::*;

#[derive(Parser)]
#[command(name = "taonet-node")]
#[command(about = "TaoNet L2 Node - Decentralized AI Inference Network")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run the node
    Run {
        /// Path to config file
        #[arg(short, long, default_value = "config.toml")]
        config: String,

        /// Run as sequencer
        #[arg(long)]
        sequencer: bool,
    },

    /// Initialize a new node
    Init {
        /// Output directory
        #[arg(short, long, default_value = ".")]
        output: String,

        /// Network (mainnet, testnet, devnet)
        #[arg(short, long, default_value = "devnet")]
        network: String,
    },

    /// Show node status
    Status {
        /// RPC endpoint
        #[arg(short, long, default_value = "http://localhost:8899")]
        rpc: String,
    },

    /// Export state
    Export {
        /// Output file
        #[arg(short, long)]
        output: String,

        /// Block height (latest if not specified)
        #[arg(long)]
        height: Option<u64>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("info,taonet=debug")
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Run { config, sequencer } => {
            tracing::info!("Starting TaoNet node...");
            tracing::info!("Config: {}", config);
            tracing::info!("Sequencer mode: {}", sequencer);

            let node_config = NodeConfig::load(&config)?;
            let node = TaoNetNode::new(node_config).await?;

            if sequencer {
                node.run_sequencer().await?;
            } else {
                node.run_validator().await?;
            }
        }

        Commands::Init { output, network } => {
            tracing::info!("Initializing new node in: {}", output);
            NodeConfig::init(&output, &network)?;
            tracing::info!("Node initialized! Edit config.toml to configure.");
        }

        Commands::Status { rpc } => {
            let status = get_node_status(&rpc).await?;
            println!("{}", serde_json::to_string_pretty(&status)?);
        }

        Commands::Export { output, height } => {
            tracing::info!("Exporting state to: {}", output);
            // TODO: Implement state export
            println!("Export complete");
        }
    }

    Ok(())
}

async fn get_node_status(rpc: &str) -> anyhow::Result<serde_json::Value> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/status", rpc))
        .send()
        .await?
        .json()
        .await?;
    Ok(response)
}
