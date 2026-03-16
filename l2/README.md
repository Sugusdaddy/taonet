# TaoNet L2

A Layer 2 network for decentralized AI inference built on Solana.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SOLANA L1                            │
│  (Settlement, Token, Bridge, Finality)                  │
└───────────────────────┬─────────────────────────────────┘
                        │ Bridge
┌───────────────────────▼─────────────────────────────────┐
│                   TAONET L2                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Tasks     │  │  Consensus  │  │   Rewards   │     │
│  │  (cheap)    │  │ (PoI)       │  │  (instant)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Features

- **Proof of Inference (PoI)**: Novel consensus mechanism for AI tasks
- **Cheap Transactions**: ~1000x cheaper than L1
- **Instant Finality**: Sub-second task completion
- **Solana Bridge**: Deposit/withdraw tokens from L1
- **Fraud Proofs**: Challenge invalid state transitions

## Components

### Runtime (`runtime/`)
- Task management
- State storage
- Inference validation
- Reward calculation

### Consensus (`consensus/`)
- Proof of Inference
- Miner selection (stake-weighted)
- Block production
- Sequencer

### Bridge (`bridge/`)
- L1 deposits
- L2 withdrawals
- State synchronization
- Fraud proof handling

### Node (`node/`)
- Full node implementation
- RPC server
- P2P networking
- Storage (RocksDB)

## Getting Started

### Build

```bash
cargo build --release
```

### Initialize Node

```bash
./target/release/taonet-node init --output ./my-node --network devnet
```

### Run Validator

```bash
./target/release/taonet-node run --config ./my-node/config.toml
```

### Run Sequencer

```bash
./target/release/taonet-node run --config ./my-node/config.toml --sequencer
```

## Configuration

Edit `config.toml`:

```toml
[identity]
keypair_path = "identity.json"
name = "my-node"

[network]
network = "devnet"
listen_addr = "0.0.0.0:9000"
bootstrap_peers = ["bootstrap.taonet.io:9000"]
max_peers = 50

[bridge]
solana_rpc = "https://api.devnet.solana.com"
bridge_program = "..."
token_mint = "..."

[rpc]
listen_addr = "0.0.0.0:8899"
websocket = true
max_connections = 1000

[storage]
data_dir = "data"
cache_size_mb = 512

# Only for sequencers:
[sequencer]
block_time_ms = 1000
max_txs_per_block = 1000
l1_batch_interval = 100
```

## RPC Methods

### Chain
- `getBlockHeight` - Current block height
- `getBlock` - Get block by height
- `getLatestBlock` - Get latest block
- `getTransaction` - Get transaction by hash

### State
- `getState` - Get full L2 state
- `getAccount` - Get miner account
- `getBalance` - Get token balance

### Tasks
- `submitTask` - Submit AI inference task
- `getTask` - Get task by ID
- `getTaskResult` - Get task result

### Mining
- `registerMiner` - Register as miner
- `getMinerInfo` - Get miner info
- `getLeaderboard` - Get miner rankings

### Bridge
- `getDepositAddress` - Get L1 deposit address
- `initiateWithdrawal` - Start withdrawal
- `getWithdrawalStatus` - Check withdrawal

## Proof of Inference (PoI)

Unlike traditional consensus mechanisms, PoI validates AI inference:

1. Task submitted to L2
2. Miners selected (stake-weighted)
3. Miners process task locally
4. Responses validated and scored
5. Best response wins reward
6. Proof batched to L1

```rust
pub struct PoIProof {
    pub task_id: TaskId,
    pub response_count: u8,
    pub winner_score: Option<u8>,
    pub proof_hash: Hash,
    pub timestamp: i64,
}
```

## Staking Tiers

| Tier | Stake Required | Reward Multiplier |
|------|----------------|-------------------|
| Bronze | 0 | 1.0x |
| Silver | 10,000 | 1.25x |
| Gold | 100,000 | 1.5x |
| Platinum | 1,000,000 | 2.0x |
| Diamond | 10,000,000 | 3.0x |

## Roadmap

- [x] Phase 1: Core implementation
- [ ] Phase 2: Testnet launch
- [ ] Phase 3: Security audit
- [ ] Phase 4: Mainnet launch
- [ ] Phase 5: Decentralized sequencing

## License

MIT
