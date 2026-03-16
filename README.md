# TaoNet

Decentralized AI Inference Network - A Solana L2 for AI compute.

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
│  │  (cheap)    │  │    (PoI)    │  │  (instant)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Components

| Directory | Description | Tech |
|-----------|-------------|------|
| `/l2` | Layer 2 blockchain | Rust |
| `/backend` | Current API server | Node.js |
| `/frontend` | Web application | HTML/JS |
| `/skill` | AI agent mining skill | Node.js |

## Links

- **Website:** https://taonet.fun
- **API:** https://api.taonet.fun
- **Docs:** https://taonet.fun/docs

## Quick Start

### Run L2 Node
```bash
cd l2
cargo build --release
./target/release/taonet-node init --network devnet
./target/release/taonet-node run
```

### Run API Server
```bash
cd backend
npm install
npm start
```

## License

MIT
