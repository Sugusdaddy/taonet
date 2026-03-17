import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Docs.css';

const DOCS_STRUCTURE = [
  {
    title: 'Getting Started',
    items: [
      { id: 'introduction', title: 'Introduction', icon: '📖' },
      { id: 'quick-start', title: 'Quick Start', icon: '🚀' },
      { id: 'connect-wallet', title: 'Connect Wallet', icon: '👛' },
    ]
  },
  {
    title: 'Mining',
    items: [
      { id: 'how-mining-works', title: 'How Mining Works', icon: '⛏️' },
      { id: 'proof-of-inference', title: 'Proof of Inference', icon: '🧠' },
      { id: 'task-difficulty', title: 'Task Difficulty', icon: '📊' },
      { id: 'rewards', title: 'Rewards System', icon: '💰' },
    ]
  },
  {
    title: 'Staking',
    items: [
      { id: 'validator-staking', title: 'Validator Staking', icon: '🔒' },
      { id: 'subnets', title: 'AI Subnets', icon: '🌐' },
      { id: 'apy-rewards', title: 'APY & Rewards', icon: '📈' },
      { id: 'unbonding', title: 'Unbonding Period', icon: '⏳' },
    ]
  },
  {
    title: 'Tokenomics',
    items: [
      { id: 'tao-token', title: 'TAO Token', icon: '🪙' },
      { id: 'supply', title: 'Token Supply', icon: '📊' },
      { id: 'distribution', title: 'Distribution', icon: '🥧' },
    ]
  },
  {
    title: 'Technical',
    items: [
      { id: 'architecture', title: 'Architecture', icon: '🏗️' },
      { id: 'solana-anchoring', title: 'Solana Anchoring', icon: '⚓' },
      { id: 'webllm', title: 'WebLLM Integration', icon: '💻' },
      { id: 'api-reference', title: 'API Reference', icon: '📡' },
    ]
  },
  {
    title: 'Community',
    items: [
      { id: 'roadmap', title: 'Roadmap', icon: '🗺️' },
      { id: 'faq', title: 'FAQ', icon: '❓' },
      { id: 'links', title: 'Links', icon: '🔗' },
    ]
  }
];

const DOCS_CONTENT = {
  'introduction': {
    title: 'Introduction to TaoNet',
    content: `
# Introduction to TaoNet

**TaoNet** is a decentralized AI inference network built on Solana. It enables anyone with a browser to contribute computing power for AI tasks and earn TAO tokens in return.

## What is TaoNet?

TaoNet revolutionizes how AI computation is performed by:

- **Decentralizing AI inference** - No single entity controls the network
- **Rewarding contributors** - Miners earn TAO tokens for completing AI tasks
- **Running in-browser** - No special hardware required, just a modern browser with WebGPU
- **Building on Solana** - Fast, cheap, and scalable blockchain anchoring

## Why TaoNet?

### The Problem

Traditional AI services are:
- Centralized and controlled by big tech
- Expensive to access
- Privacy-invasive
- Limited in availability

### The Solution

TaoNet creates an open marketplace where:
- Anyone can contribute computing power
- AI inference is distributed globally
- Users maintain privacy
- Costs are dramatically reduced

## Key Features

| Feature | Description |
|---------|-------------|
| Browser Mining | Mine directly in your browser using WebGPU |
| Proof of Inference | Cryptographic proof that AI work was performed |
| Solana Anchoring | L2 proofs anchored to Solana for security |
| Real Rewards | Earn TAO tokens for every completed task |
| Validator Staking | Stake on AI subnets and earn passive income |

## Getting Started

Ready to start mining? Check out the [Quick Start](/docs/quick-start) guide to begin earning TAO in minutes.
    `
  },
  'quick-start': {
    title: 'Quick Start Guide',
    content: `
# Quick Start Guide

Get started with TaoNet in 5 minutes.

## Prerequisites

Before you begin, make sure you have:

1. **A modern browser** - Chrome, Edge, or Brave with WebGPU support
2. **A Solana wallet** - Phantom, Solflare, or any supported wallet
3. **Some SOL** - For transaction fees (very minimal)

## Step 1: Connect Your Wallet

1. Visit [taonet.fun](https://taonet.fun)
2. Click the green **"Select Wallet"** button
3. Choose your preferred wallet (Phantom, Solflare, etc.)
4. Approve the connection in your wallet

## Step 2: Register as a Miner

1. Navigate to the **Mine** page
2. Enter a display name for your miner
3. Click **"Register Miner"**
4. Confirm the transaction in your wallet

## Step 3: Start Mining

1. Click **"Initialize Model"** to load the AI model
2. Wait for the model to download (first time only, ~500MB)
3. Once loaded, click **"Start Mining"**
4. Watch as tasks are completed and rewards accumulate!

## Step 4: Claim Rewards

Rewards are automatically sent to your wallet after each completed task. You can view your earnings on the **Dashboard** page.

## Tips for Better Mining

- **Use a dedicated tab** - Don't close the mining tab
- **Keep your device plugged in** - Mining uses GPU power
- **Check task difficulty** - Higher difficulty = higher rewards
- **Stay consistent** - Longer mining sessions earn more

## Troubleshooting

### Model won't load?
- Make sure you're using Chrome, Edge, or Brave
- Check that WebGPU is enabled in your browser
- Try refreshing the page

### No tasks appearing?
- The network might be busy, wait a few seconds
- Check your internet connection
- Try reconnecting your wallet

## Next Steps

- Learn about [How Mining Works](/docs/how-mining-works)
- Explore [Validator Staking](/docs/validator-staking)
- Check the [FAQ](/docs/faq)
    `
  },
  'connect-wallet': {
    title: 'Connect Wallet',
    content: `
# Connect Your Wallet

TaoNet supports 30+ Solana wallets. Here's how to connect.

## Supported Wallets

### Popular Wallets
- **Phantom** - Most popular Solana wallet
- **Solflare** - Feature-rich with staking
- **Coinbase Wallet** - Great for beginners
- **Trust Wallet** - Mobile-friendly

### Hardware Wallets
- **Ledger** - Maximum security
- **Trezor** - Open-source hardware wallet
- **Keystone** - Air-gapped security

### Other Wallets
- Coin98, BitKeep, SafePal, TokenPocket, MathWallet, and 20+ more

## How to Connect

### Desktop

1. Click **"Select Wallet"** in the navigation
2. A modal will appear with all available wallets
3. Click on your wallet of choice
4. Approve the connection in your wallet extension

### Mobile

1. Open TaoNet in your wallet's built-in browser
2. Click **"Select Wallet"**
3. Your wallet will auto-detect
4. Approve the connection

## Wallet Security Tips

- **Never share your seed phrase** - TaoNet will never ask for it
- **Verify the URL** - Always check you're on taonet.fun
- **Use a hardware wallet** - For large holdings
- **Revoke unused permissions** - Regularly check connected apps

## Disconnecting

To disconnect your wallet:

1. Click your wallet address in the navigation
2. Select **"Disconnect"** from the dropdown
3. Your session will end

## Need Help?

If you're having trouble connecting, check out our [FAQ](/docs/faq) or join our community.
    `
  },
  'how-mining-works': {
    title: 'How Mining Works',
    content: `
# How Mining Works

TaoNet mining is fundamentally different from traditional cryptocurrency mining.

## AI-Powered Mining

Instead of solving arbitrary mathematical puzzles (like Bitcoin), TaoNet miners perform **actual AI inference tasks**. This means:

- Your computing power does useful work
- The network becomes more valuable as it grows
- No wasted energy on pointless calculations

## The Mining Process

\`\`\`
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Request   │ -> │   Process   │ -> │   Submit    │
│    Task     │    │   with AI   │    │   Proof     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       v                  v                  v
   Get prompt      Run inference      Verify & reward
   from network    using WebLLM       on blockchain
\`\`\`

### 1. Task Assignment

When you start mining, the network assigns you AI tasks. These can include:

- Text generation
- Question answering
- Summarization
- Classification
- And more...

### 2. AI Inference

Your browser runs a local AI model (Llama-3.2-1B) using WebLLM and WebGPU:

- **WebLLM** - Runs LLMs directly in the browser
- **WebGPU** - Accelerates computation using your GPU
- **Local Processing** - Your data never leaves your device

### 3. Proof Generation

After completing a task, your browser generates a **Proof of Inference**:

\`\`\`json
{
  "taskId": "abc123",
  "prompt": "What is Solana?",
  "response": "Solana is a high-performance blockchain...",
  "responseHash": "0x7f83b...",
  "timestamp": 1710672000,
  "signature": "0x3a2b1c..."
}
\`\`\`

### 4. Verification & Reward

The network verifies your proof and rewards you:

1. Proof is submitted to the TaoNet backend
2. Response quality is validated
3. TAO tokens are sent to your wallet
4. Your stats are updated

## Mining Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Browser | Chrome 113+ | Chrome latest |
| RAM | 4GB | 8GB+ |
| GPU | WebGPU support | Dedicated GPU |
| Internet | 5 Mbps | 20+ Mbps |

## Server-Side Fallback

If your device doesn't support WebGPU, TaoNet can process tasks server-side. You'll still earn rewards, but at a slightly reduced rate.

## Next: Learn about [Proof of Inference](/docs/proof-of-inference)
    `
  },
  'proof-of-inference': {
    title: 'Proof of Inference',
    content: `
# Proof of Inference (PoI)

TaoNet uses a novel consensus mechanism called **Proof of Inference** to verify that AI work was actually performed.

## What is Proof of Inference?

Proof of Inference is a cryptographic protocol that proves:

1. An AI model processed a specific input
2. The output matches the expected quality
3. The work was done by the claiming miner

## How It Works

### Step 1: Task Commitment

When a miner requests a task, they commit to processing it:

\`\`\`
commitment = hash(minerAddress + taskId + timestamp)
\`\`\`

### Step 2: Inference Execution

The miner runs the AI model locally and captures:

- Input prompt
- Output response
- Computation metrics
- Timing data

### Step 3: Proof Generation

A proof is generated containing:

\`\`\`javascript
{
  // Task identification
  taskId: "task_abc123",
  minerId: "miner_xyz789",
  
  // Inference data
  promptHash: hash(prompt),
  responseHash: hash(response),
  
  // Verification data
  modelId: "llama-3.2-1b",
  inferenceTime: 1250, // ms
  tokensGenerated: 150,
  
  // Cryptographic proof
  signature: sign(data, minerPrivateKey),
  timestamp: Date.now()
}
\`\`\`

### Step 4: Verification

The network verifies proofs through:

1. **Signature verification** - Confirms miner identity
2. **Response sampling** - Random re-computation checks
3. **Quality scoring** - AI-based response evaluation
4. **Timing analysis** - Detects anomalies

## Why PoI Matters

### vs Proof of Work (Bitcoin)
- PoW: Wastes energy on arbitrary hashes
- PoI: Uses energy for useful AI computation

### vs Proof of Stake (Ethereum)
- PoS: Rewards capital, not contribution
- PoI: Rewards actual work performed

### vs Centralized AI
- Centralized: Trust the provider
- PoI: Cryptographic verification

## Security Model

Proof of Inference prevents:

- **Fake responses** - Hash verification
- **Replay attacks** - Unique task IDs
- **Sybil attacks** - Computational cost
- **Collusion** - Random sampling

## Solana Anchoring

Every 10 blocks, TaoNet anchors proof summaries to Solana:

\`\`\`
Merkle Root of Proofs -> Solana Memo Program
\`\`\`

This provides:
- Immutable proof record
- Cross-chain verification
- Dispute resolution data
    `
  },
  'task-difficulty': {
    title: 'Task Difficulty',
    content: `
# Task Difficulty System

TaoNet uses a 6-tier difficulty system that rewards skilled miners with higher payouts.

## Difficulty Tiers

| Tier | Name | Reward Mult | XP Mult | Description |
|------|------|-------------|---------|-------------|
| 1 | Novice | 1.0x | 1.0x | Simple, short responses |
| 2 | Apprentice | 1.5x | 1.2x | Moderate complexity |
| 3 | Journeyman | 2.0x | 1.5x | Detailed explanations |
| 4 | Expert | 3.0x | 2.0x | Technical accuracy required |
| 5 | Master | 4.0x | 2.5x | Complex multi-step reasoning |
| 6 | Grandmaster | 5.0x | 3.0x | Highest quality standards |

## How Difficulty is Assigned

Tasks are assigned difficulty based on:

### 1. Prompt Complexity
- Word count
- Technical terms
- Required knowledge depth

### 2. Expected Response
- Length requirements
- Accuracy standards
- Formatting needs

### 3. Miner Level
- Higher level miners get harder tasks
- Progression unlocks new difficulties

## Leveling Up

Your miner level determines task access:

\`\`\`
Level 1-5:   Novice, Apprentice
Level 6-10:  + Journeyman
Level 11-20: + Expert
Level 21-35: + Master
Level 36+:   + Grandmaster
\`\`\`

## XP System

Earn XP by completing tasks:

- Novice task: 10 XP
- Apprentice task: 15 XP
- Journeyman task: 25 XP
- Expert task: 40 XP
- Master task: 65 XP
- Grandmaster task: 100 XP

### Level Thresholds

| Level | Total XP Required |
|-------|-------------------|
| 1 | 0 |
| 5 | 500 |
| 10 | 2,000 |
| 20 | 10,000 |
| 35 | 50,000 |
| 50 | 150,000 |

## Strategy Tips

1. **Start with Novice** - Build consistency
2. **Focus on quality** - Failed tasks hurt reputation
3. **Grind Journeyman** - Best effort/reward ratio
4. **Attempt Expert when ready** - Don't rush
5. **Grandmaster is elite** - Less than 1% of miners
    `
  },
  'rewards': {
    title: 'Rewards System',
    content: `
# Rewards System

Understand how TaoNet rewards miners for their contributions.

## Reward Structure

### Base Rewards

Each completed task earns a base reward:

\`\`\`
Base Reward = Task Difficulty × Network Rate
\`\`\`

Current network rate: **~10 TAO per task** (varies with network activity)

### Multipliers

Your final reward is modified by:

| Factor | Multiplier Range |
|--------|------------------|
| Task Difficulty | 1.0x - 5.0x |
| Miner Level | 1.0x - 1.5x |
| Streak Bonus | 1.0x - 2.0x |
| Quality Score | 0.5x - 1.5x |

### Example Calculation

\`\`\`
Task: Expert (3.0x)
Miner Level 15: 1.15x
5-day streak: 1.25x
Quality: Excellent (1.2x)

Reward = 10 × 3.0 × 1.15 × 1.25 × 1.2 = 51.75 TAO
\`\`\`

## Jackpots

Random jackpots add excitement:

- **Mini Jackpot** (1/100): 10x reward
- **Mega Jackpot** (1/1000): 100x reward
- **Ultra Jackpot** (1/10000): 1000x reward

## Streaks

Consecutive daily mining earns streak bonuses:

| Streak Days | Bonus |
|-------------|-------|
| 3 days | +10% |
| 7 days | +25% |
| 14 days | +50% |
| 30 days | +100% |

Missing a day resets your streak!

## Achievements

One-time bonuses for milestones:

- First Task: 100 TAO
- 100 Tasks: 500 TAO
- 1000 Tasks: 2,500 TAO
- Level 10: 1,000 TAO
- Level 25: 5,000 TAO

## Daily Limits

To ensure fair distribution:

- **Daily Airdrop Limit**: 25,000 TAO total network
- **Per-Miner Limit**: 1,000 TAO per day

Limits reset at 00:00 UTC.

## Claiming Rewards

Rewards are automatically sent to your connected wallet after each task. No manual claiming required!

View your reward history on the **Dashboard** page.
    `
  },
  'validator-staking': {
    title: 'Validator Staking',
    content: `
# Validator Staking

Earn passive income by staking TAO tokens on AI subnets.

## What is Validator Staking?

Validator staking allows you to delegate your TAO tokens to AI subnets (validators) that process specific types of inference tasks. In return, you earn a share of the rewards generated by that subnet.

## How It Works

1. **Choose a Subnet** - Select from 10 specialized AI subnets
2. **Stake TAO** - Deposit tokens to the subnet
3. **Earn Rewards** - Receive daily APY payments
4. **Unstake** - Withdraw after unbonding period

## Benefits

- **Passive Income** - Earn without active mining
- **Support the Network** - Your stake secures AI inference
- **Flexible Options** - Choose risk/reward balance
- **Compound Growth** - Reinvest rewards

## Staking Requirements

| Requirement | Details |
|-------------|---------|
| Minimum Stake | 100-500 TAO (varies by subnet) |
| Unbonding Period | 7-21 days |
| Commission | 3-10% of rewards |
| Reward Frequency | Daily |

## Getting Started

1. Go to the **Stake** page
2. Browse available subnets
3. Click **"Stake Now"** on your chosen subnet
4. Enter the amount to stake
5. Confirm the transaction in your wallet

## Risk Considerations

- **Unbonding Period** - Funds locked during unstaking
- **Subnet Performance** - APY varies with task volume
- **Smart Contract Risk** - As with any DeFi

## Pro Tips

1. **Diversify** - Stake across multiple subnets
2. **Check Performance** - Higher uptime = more reliable
3. **Consider Commission** - Lower isn't always better
4. **Long-term Thinking** - Compound for maximum gains
    `
  },
  'subnets': {
    title: 'AI Subnets',
    content: `
# AI Subnets

TaoNet is organized into specialized AI subnets, each focused on different types of inference tasks.

## What are Subnets?

Subnets are specialized networks within TaoNet that handle specific AI tasks. Think of them as departments in a company, each with its own expertise.

## Active Subnets

### Subnet 1: Text Generation
**APY: 12.5%** | Min Stake: 100 TAO

The backbone of TaoNet. Handles conversational AI, text completion, and general language tasks.

---

### Subnet 2: Image Recognition
**APY: 15.8%** | Min Stake: 100 TAO

Computer vision subnet for image classification, object detection, and visual understanding.

---

### Subnet 3: Code Intelligence
**APY: 14.2%** | Min Stake: 250 TAO

Specialized in code generation, debugging, optimization, and development assistance.

---

### Subnet 4: Translation Engine
**APY: 9.8%** | Min Stake: 100 TAO

Multi-language translation supporting 100+ languages with contextual understanding.

---

### Subnet 5: Document Analysis
**APY: 11.3%** | Min Stake: 100 TAO

Summarization, key extraction, and document understanding.

---

### Subnet 6: Sentiment Mining
**APY: 13.4%** | Min Stake: 100 TAO

Emotion detection, opinion analysis, and social media sentiment processing.

---

### Subnet 7: Data Validation
**APY: 8.9%** | Min Stake: 500 TAO

Critical infrastructure for verifying and validating structured data.

---

### Subnet 8: Knowledge Graph
**APY: 10.7%** | Min Stake: 100 TAO

Factual Q&A, information retrieval, and knowledge base queries.

---

### Subnet 9: Creative Studio
**APY: 18.5%** | Min Stake: 100 TAO

Story generation, creative writing, and artistic content creation.

---

### Subnet 10: Logic Engine
**APY: 14.9%** | Min Stake: 250 TAO

Mathematical reasoning, logical deduction, and problem solving.

## Choosing a Subnet

Consider these factors:

| Factor | Low Risk | High Risk |
|--------|----------|-----------|
| APY | 8-12% | 15-20% |
| Min Stake | 100 TAO | 250-500 TAO |
| Unbonding | 7 days | 14-21 days |
| Use Case | Established | Emerging |

## Future Subnets

Coming soon:
- Audio Transcription
- Video Analysis
- 3D Generation
- Scientific Research
    `
  },
  'apy-rewards': {
    title: 'APY & Rewards',
    content: `
# APY & Staking Rewards

Understanding how staking rewards are calculated and distributed.

## How APY Works

APY (Annual Percentage Yield) represents your expected yearly return on staked tokens.

\`\`\`
Yearly Reward = Staked Amount × APY
Daily Reward = Yearly Reward / 365
\`\`\`

### Example

Staking 1,000 TAO at 12% APY:

\`\`\`
Yearly:  1,000 × 0.12 = 120 TAO
Monthly: 120 / 12 = 10 TAO
Daily:   120 / 365 = 0.33 TAO
\`\`\`

## APY Factors

APY is determined by:

### 1. Task Volume
More tasks processed = higher rewards

### 2. Subnet Performance
Better uptime = more consistent rewards

### 3. Total Staked
More stakers = rewards split further

### 4. Commission Rate
Subnet takes a cut (3-10%)

## Reward Distribution

Rewards are distributed daily at 00:00 UTC:

1. Subnet earns task fees
2. Commission deducted
3. Remaining split among stakers
4. Proportional to stake amount

## Compounding

Reinvest rewards to compound growth:

| Initial | APY | Year 1 | Year 3 | Year 5 |
|---------|-----|--------|--------|--------|
| 1,000 | 12% | 1,120 | 1,405 | 1,762 |
| 1,000 | 15% | 1,150 | 1,521 | 2,011 |
| 1,000 | 18% | 1,180 | 1,643 | 2,288 |

## Tax Considerations

Staking rewards may be taxable income. Consult a tax professional for advice specific to your jurisdiction.

## Maximizing Returns

1. **Stake early** - Compound effect
2. **Choose wisely** - Research subnets
3. **Reinvest** - Don't withdraw rewards
4. **Diversify** - Spread across subnets
5. **Monitor** - Rebalance periodically
    `
  },
  'unbonding': {
    title: 'Unbonding Period',
    content: `
# Unbonding Period

When you unstake tokens, they enter an unbonding period before becoming available.

## What is Unbonding?

Unbonding is a security feature that:

- Prevents rapid withdrawals during attacks
- Ensures network stability
- Protects other stakers

## Unbonding Times by Subnet

| Subnet | Unbonding Period |
|--------|------------------|
| Text Generation | 7 days |
| Image Recognition | 7 days |
| Code Intelligence | 14 days |
| Translation Engine | 7 days |
| Document Analysis | 7 days |
| Sentiment Mining | 7 days |
| Data Validation | 21 days |
| Knowledge Graph | 7 days |
| Creative Studio | 7 days |
| Logic Engine | 14 days |

## The Unbonding Process

1. **Request Unstake** - Initiate unbonding
2. **Waiting Period** - Tokens are locked
3. **No Rewards** - Unbonding tokens don't earn
4. **Withdrawal** - Tokens return to wallet

## Important Notes

- **Cannot cancel** - Once started, unbonding continues
- **No rewards** - Unbonding tokens stop earning immediately
- **Partial unstake** - You can unstake any amount
- **Multiple unbondings** - Can have several in progress

## Why Different Periods?

Longer unbonding = More critical subnet

- **7 days** - Standard subnets
- **14 days** - Specialized/technical subnets
- **21 days** - Critical infrastructure

## Planning Your Exit

If you need liquidity:

1. Start unbonding early
2. Stagger withdrawals
3. Keep emergency funds unstaked
4. Consider opportunity cost
    `
  },
  'tao-token': {
    title: 'TAO Token',
    content: `
# TAO Token

TAO is the native utility token of the TaoNet ecosystem.

## Token Overview

| Property | Value |
|----------|-------|
| Name | TaoNet Token |
| Symbol | TAO |
| Blockchain | Solana |
| Standard | SPL Token |
| Decimals | 9 |

## Token Address

\`\`\`
5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump
\`\`\`

## Utility

TAO is used for:

### 1. Mining Rewards
Earned by completing AI inference tasks

### 2. Staking
Delegate to subnets and earn APY

### 3. Governance (Coming Soon)
Vote on network proposals

### 4. Access
Premium features and priority tasks

## Where to Get TAO

### Earn It
- Mine AI tasks
- Stake and earn APY
- Complete achievements
- Win jackpots

### Buy It
- Pump.fun
- Raydium
- Jupiter

## Token Security

- **Audited contracts** - Professional security review
- **No admin keys** - Immutable token
- **Transparent** - All transactions on-chain
- **Solana native** - Benefit from Solana security

## Price Tracking

Track TAO price on:
- DexScreener
- Birdeye
- Solscan
    `
  },
  'supply': {
    title: 'Token Supply',
    content: `
# Token Supply

Understanding TaoNet's tokenomics.

## Total Supply

\`\`\`
Total Supply: 1,000,000,000 TAO (1 Billion)
\`\`\`

## Supply Breakdown

| Allocation | Amount | Percentage |
|------------|--------|------------|
| Mining Rewards | 400,000,000 | 40% |
| Staking Rewards | 200,000,000 | 20% |
| Team & Development | 150,000,000 | 15% |
| Community & Marketing | 100,000,000 | 10% |
| Liquidity | 100,000,000 | 10% |
| Treasury | 50,000,000 | 5% |

## Emission Schedule

### Mining Rewards (40%)

Released over 4 years with halving:

- Year 1: 160M TAO
- Year 2: 80M TAO
- Year 3: 40M TAO
- Year 4: 20M TAO
- Remaining: Long-tail emission

### Staking Rewards (20%)

Distributed based on:
- Subnet performance
- Total staked amount
- Individual stake duration

## Circulating Supply

Current circulating supply can be found on:
- Solscan
- Birdeye
- Our dashboard

## Deflationary Mechanisms

Future implementations may include:
- Task fee burning
- Buyback programs
- Governance proposals

## Transparency

All token movements are:
- Publicly visible on Solana
- Tracked via Explorer
- Reported in monthly updates
    `
  },
  'distribution': {
    title: 'Token Distribution',
    content: `
# Token Distribution

How TAO tokens flow through the ecosystem.

## Distribution Flow

\`\`\`
┌─────────────────────────────────────────────────┐
│                  TAO ECOSYSTEM                   │
├─────────────────────────────────────────────────┤
│                                                  │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│   │ Mining  │ --> │ Miners  │ --> │ Market  │  │
│   │ Pool    │     │         │     │         │  │
│   └─────────┘     └─────────┘     └─────────┘  │
│        │                               │        │
│        v                               v        │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│   │ Staking │ --> │ Stakers │ --> │ Subnets │  │
│   │ Pool    │     │         │     │         │  │
│   └─────────┘     └─────────┘     └─────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
\`\`\`

## Mining Distribution

Daily mining rewards:
- Maximum: 25,000 TAO / day
- Per miner cap: 1,000 TAO / day
- Distributed based on tasks completed

## Staking Distribution

Subnet rewards distributed:
- Daily at 00:00 UTC
- Proportional to stake
- After commission deduction

## Team Vesting

Team tokens (15%) vest over 3 years:

| Period | Unlocked |
|--------|----------|
| TGE | 0% |
| 6 months | 10% |
| 12 months | 25% |
| 24 months | 60% |
| 36 months | 100% |

## Community Distribution

Community tokens (10%) used for:
- Airdrops
- Partnerships
- Ambassador program
- Ecosystem grants

## Fair Launch

TaoNet was fair launched:
- No presale
- No private investors
- Equal opportunity for all
- Community-driven growth
    `
  },
  'architecture': {
    title: 'Architecture',
    content: `
# TaoNet Architecture

Technical overview of how TaoNet works.

## System Overview

\`\`\`
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  React + Vite + WebLLM + Solana Wallet Adapter         │
└────────────────────────────────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────┐
│                      BACKEND                            │
│  Node.js + Express + MongoDB + WebSocket               │
└────────────────────────────────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────┐
│                      SOLANA                             │
│  SPL Token + Memo Program + Merkle Anchoring           │
└────────────────────────────────────────────────────────┘
\`\`\`

## Components

### Frontend (React)
- User interface
- Wallet connection
- Mining interface
- Dashboard & stats

### WebLLM
- Browser-based AI inference
- WebGPU acceleration
- Llama-3.2-1B model
- Local processing

### Backend (Node.js)
- Task distribution
- Proof verification
- Reward calculation
- API endpoints

### MongoDB
- Miner profiles
- Task history
- Proof storage
- Leaderboards

### Solana Integration
- SPL Token (TAO)
- Merkle root anchoring
- Transaction verification
- Wallet authentication

## Data Flow

1. **Task Request**
   - Miner requests task from backend
   - Backend assigns based on difficulty/level

2. **AI Processing**
   - WebLLM processes prompt locally
   - Response generated in browser
   - Proof created with hash + signature

3. **Proof Submission**
   - Proof sent to backend
   - Verification checks performed
   - Reward calculated

4. **Reward Distribution**
   - TAO tokens airdropped
   - Stats updated
   - Anchored to Solana (batched)

## Security Layers

| Layer | Protection |
|-------|------------|
| Frontend | Wallet signatures |
| Backend | Rate limiting, validation |
| Database | Encryption, backups |
| Blockchain | Immutable anchoring |
    `
  },
  'solana-anchoring': {
    title: 'Solana Anchoring',
    content: `
# Solana Anchoring

How TaoNet leverages Solana for security and transparency.

## What is Anchoring?

Anchoring is the process of recording TaoNet state on the Solana blockchain, creating an immutable audit trail.

## Why Solana?

| Feature | Benefit |
|---------|---------|
| Speed | 400ms finality |
| Cost | ~$0.00025/tx |
| Security | PoS consensus |
| Ecosystem | Rich DeFi integration |

## Anchoring Process

Every 10 TaoNet blocks, we anchor:

\`\`\`javascript
// Collect proofs from block
const proofs = getBlockProofs(blockNumber);

// Build Merkle tree
const leaves = proofs.map(p => hash(p));
const merkleTree = buildMerkleTree(leaves);
const merkleRoot = merkleTree.getRoot();

// Anchor to Solana
await anchorToSolana({
  blockNumber,
  merkleRoot,
  proofCount: proofs.length,
  timestamp: Date.now()
});
\`\`\`

## What Gets Anchored

Each anchor contains:

\`\`\`json
{
  "v": 1,
  "type": "taonet_anchor",
  "block": 12345,
  "merkle_root": "7f83b1657ff1fc53...",
  "proofs": 150,
  "timestamp": 1710672000
}
\`\`\`

## Solana Programs Used

### Memo Program
For data anchoring:
\`\`\`
Program: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr
\`\`\`

### SPL Token
For TAO token:
\`\`\`
Program: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
\`\`\`

## Verification

Anyone can verify anchors:

1. Get anchor transaction from Solana
2. Extract Merkle root
3. Request proofs from TaoNet API
4. Verify Merkle inclusion

## Cost Efficiency

| Operation | Cost |
|-----------|------|
| Anchor (10 blocks) | ~$0.000005 |
| Token transfer | ~$0.00025 |
| Daily anchoring | ~$0.05 |
| Monthly total | ~$1.50 |

## Explorer Integration

View all anchors on:
- Solscan
- Solana FM
- TaoNet Explorer
    `
  },
  'webllm': {
    title: 'WebLLM Integration',
    content: `
# WebLLM Integration

TaoNet uses WebLLM to run AI models directly in your browser.

## What is WebLLM?

WebLLM is a project that brings large language models to the browser using WebGPU acceleration.

## How It Works

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │ --> │   WebGPU    │ --> │    Model    │
│   Request   │     │   Runtime   │     │   Weights   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           v
                    ┌─────────────┐
                    │   Response  │
                    │   + Proof   │
                    └─────────────┘
\`\`\`

## Model Specification

| Property | Value |
|----------|-------|
| Model | Llama-3.2-1B-Instruct |
| Quantization | q4f16_1-MLC |
| Size | ~500MB |
| Parameters | 1 Billion |
| Context | 4096 tokens |

## WebGPU Requirements

### Supported Browsers
- Chrome 113+
- Edge 113+
- Brave (with flag)
- Firefox (experimental)

### Hardware
- Modern GPU (2018+)
- 4GB+ VRAM recommended
- WebGPU-capable driver

## First-Time Setup

1. **Model Download** (~500MB)
   - One-time download
   - Cached locally
   - Progress shown in UI

2. **Initialization** (~10s)
   - Model loaded to GPU
   - Warmup inference
   - Ready status shown

## Privacy Benefits

All processing is local:
- Prompts never leave your device
- Responses generated locally
- Only hashes submitted to network
- Complete data privacy

## Performance

| Device | Tokens/sec |
|--------|------------|
| RTX 4090 | 80-100 |
| RTX 3080 | 50-70 |
| M1 MacBook | 30-50 |
| Integrated GPU | 10-20 |

## Fallback Mode

If WebGPU isn't available:
- Server-side processing
- Same rewards (slightly reduced)
- Automatic detection
- Seamless experience
    `
  },
  'api-reference': {
    title: 'API Reference',
    content: `
# API Reference

TaoNet REST API documentation.

## Base URL

\`\`\`
https://api.taonet.fun
\`\`\`

## Authentication

Most endpoints are public. Authenticated endpoints require a valid Solana wallet signature.

---

## Endpoints

### Health Check

\`\`\`http
GET /health
\`\`\`

**Response:**
\`\`\`json
{
  "status": "ok",
  "time": "2024-03-17T10:00:00.000Z"
}
\`\`\`

---

### Get Network Stats

\`\`\`http
GET /api/stats
\`\`\`

**Response:**
\`\`\`json
{
  "totalMiners": 1250,
  "activeMiners": 89,
  "totalTasks": 150000,
  "totalRewards": "5000000000000000000"
}
\`\`\`

---

### Get Leaderboard

\`\`\`http
GET /api/miners/leaderboard?sortBy=composite&limit=50
\`\`\`

**Parameters:**
- \`sortBy\`: composite, tasks, rewards, level
- \`limit\`: 1-100 (default: 50)

---

### Get Miner

\`\`\`http
GET /api/miners/:address
\`\`\`

**Response:**
\`\`\`json
{
  "miner": {
    "address": "7xKX...",
    "name": "CryptoMiner",
    "level": 15,
    "xp": 12500,
    "stats": {
      "completedTasks": 1234,
      "totalRewards": "50000000000000000000"
    }
  }
}
\`\`\`

---

### Register Miner

\`\`\`http
POST /api/miners/register
Content-Type: application/json

{
  "address": "7xKX...",
  "name": "MyMiner"
}
\`\`\`

---

### Get Tasks

\`\`\`http
GET /api/tasks?status=pending&limit=10
\`\`\`

---

### Submit Proof

\`\`\`http
POST /api/proofs
Content-Type: application/json

{
  "taskId": "abc123",
  "response": "The answer is...",
  "responseHash": "0x7f83...",
  "minerAddress": "7xKX...",
  "signature": "0x3a2b..."
}
\`\`\`

---

### Get Validators

\`\`\`http
GET /api/validators
\`\`\`

---

### Stake Tokens

\`\`\`http
POST /api/validators/stake
Content-Type: application/json

{
  "address": "7xKX...",
  "validatorId": 1,
  "amount": "100000000000"
}
\`\`\`

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Public GET | 100/min |
| Authenticated | 60/min |
| Submit Proof | 10/min |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |
    `
  },
  'roadmap': {
    title: 'Roadmap',
    content: `
# Roadmap

TaoNet development timeline and future plans.

## Completed

### Q4 2024 - Foundation

- [x] Core mining infrastructure
- [x] WebLLM integration
- [x] Solana token launch
- [x] Basic dashboard
- [x] Proof of Inference v1

### Q1 2025 - Growth

- [x] Leaderboard system
- [x] Achievement system
- [x] Multi-wallet support (30+ wallets)
- [x] Validator staking (10 subnets)
- [x] Mobile-responsive UI
- [x] API documentation

## In Progress

### Q2 2025 - Expansion

- [ ] Mobile PWA app
- [ ] Multi-model support
- [ ] Advanced analytics
- [ ] Referral program
- [ ] Governance token voting

## Planned

### Q3 2025 - Scale

- [ ] Additional AI subnets
- [ ] Cross-chain bridges
- [ ] Enterprise API
- [ ] SDK release
- [ ] Audit completion

### Q4 2025 - Ecosystem

- [ ] Developer grants program
- [ ] Partnership integrations
- [ ] Advanced staking features
- [ ] DAO governance launch
- [ ] Mainnet v2

## Future Vision

### 2026 and Beyond

- Decentralized model hosting
- Custom model training
- Multi-chain deployment
- Real-world AI services
- Global compute network

## Community Input

Have ideas? Share them:
- Discord community
- Governance proposals
- GitHub discussions

The roadmap is community-driven and subject to change based on feedback and market conditions.
    `
  },
  'faq': {
    title: 'FAQ',
    content: `
# Frequently Asked Questions

Common questions about TaoNet.

## General

### What is TaoNet?
TaoNet is a decentralized AI inference network where you can earn TAO tokens by contributing computing power for AI tasks.

### Is TaoNet free to use?
Yes! Mining is free. You just need a modern browser and a Solana wallet.

### What wallets are supported?
We support 30+ Solana wallets including Phantom, Solflare, Coinbase, Trust Wallet, Ledger, and more.

---

## Mining

### How do I start mining?
1. Connect your wallet
2. Register as a miner
3. Initialize the AI model
4. Click "Start Mining"

### Why won't the model load?
- Make sure you're using Chrome, Edge, or Brave
- WebGPU must be enabled
- Try refreshing the page
- Check you have enough RAM (4GB minimum)

### How much can I earn?
Earnings depend on task difficulty, your level, and network activity. Average miners earn 50-500 TAO per day.

### Is mining 24/7 required?
No! Mine whenever you want. Consistency helps with streak bonuses though.

---

## Staking

### What is the minimum stake?
Depends on the subnet: 100-500 TAO minimum.

### How long is the unbonding period?
7-21 days depending on the subnet.

### When are rewards paid?
Daily at 00:00 UTC.

### Can I unstake anytime?
Yes, but you must wait the unbonding period to receive your tokens.

---

## Tokens

### Where can I buy TAO?
- Pump.fun
- Raydium
- Jupiter

### What is the total supply?
1 billion TAO tokens.

### Is TAO inflationary?
No, fixed supply of 1 billion tokens.

---

## Technical

### What AI model is used?
Llama-3.2-1B-Instruct, quantized for browser use.

### Is my data private?
Yes! All AI processing happens locally in your browser. Only response hashes are submitted.

### What is Proof of Inference?
A cryptographic proof that AI work was performed, similar to Proof of Work but useful.

---

## Troubleshooting

### Mining stopped working?
- Refresh the page
- Reconnect your wallet
- Check internet connection
- Try a different browser

### Not receiving rewards?
- Verify your wallet address
- Check transaction on Solscan
- Ensure tasks completed successfully
- Contact support if issue persists

### Website not loading?
- Clear browser cache
- Disable VPN if using one
- Try incognito mode
- Check status.taonet.fun
    `
  },
  'links': {
    title: 'Links',
    content: `
# Official Links

All official TaoNet resources and communities.

## Main Links

| Platform | Link |
|----------|------|
| Website | [taonet.fun](https://taonet.fun) |
| Documentation | [taonet.fun/docs](https://taonet.fun/docs) |
| Explorer | [taonet.fun/explorer](https://taonet.fun/explorer) |

## Token

| Platform | Link |
|----------|------|
| Token Address | \`5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump\` |
| DexScreener | [View Chart](https://dexscreener.com/solana/5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump) |
| Birdeye | [View Token](https://birdeye.so/token/5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump) |

## Social Media

| Platform | Link |
|----------|------|
| Twitter/X | [@TaoNetAI](https://twitter.com/TaoNetAI) |
| Discord | [Join Server](https://discord.gg/taonet) |
| Telegram | [Join Group](https://t.me/taonet) |

## Development

| Platform | Link |
|----------|------|
| GitHub | [TaoNet Repo](https://github.com/taonet) |
| API Docs | [api.taonet.fun](https://api.taonet.fun) |

## Brand Assets

Download official logos and brand materials:
- [Logo Package](#)
- [Brand Guidelines](#)
- [Press Kit](#)

---

## Security Notice

**Official domains only:**
- taonet.fun
- api.taonet.fun

**Never trust:**
- DMs asking for seed phrases
- "Support" in Telegram
- Unofficial websites

Stay safe!
    `
  }
};

export default function Docs() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentDoc = DOCS_CONTENT[activeSection];

  const handleNavClick = (id) => {
    setActiveSection(id);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="docs-page">
      {/* Mobile Header */}
      <div className="docs-mobile-header">
        <button className="docs-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h1>Documentation</h1>
      </div>

      {/* Sidebar */}
      <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="docs-sidebar-header">
          <Link to="/" className="docs-logo">
            <img src="/logo.svg" alt="TaoNet" />
            <span>TaoNet Docs</span>
          </Link>
        </div>

        <nav className="docs-nav">
          {DOCS_STRUCTURE.map(section => (
            <div key={section.title} className="docs-nav-section">
              <h3 className="docs-nav-title">{section.title}</h3>
              <ul className="docs-nav-list">
                {section.items.map(item => (
                  <li key={item.id}>
                    <button
                      className={`docs-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <span className="docs-nav-icon">{item.icon}</span>
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="docs-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Content */}
      <main className="docs-content">
        <article className="docs-article">
          <div className="docs-article-content" dangerouslySetInnerHTML={{ 
            __html: currentDoc?.content
              .replace(/^# (.*$)/gm, '<h1>$1</h1>')
              .replace(/^## (.*$)/gm, '<h2>$1</h2>')
              .replace(/^### (.*$)/gm, '<h3>$1</h3>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, '<pre><code class="language-$1">$2</code></pre>')
              .replace(/`([^`]+)`/g, '<code>$1</code>')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
              .replace(/^\- \[x\] (.*$)/gm, '<div class="checklist checked">$1</div>')
              .replace(/^\- \[ \] (.*$)/gm, '<div class="checklist">$1</div>')
              .replace(/^\- (.*$)/gm, '<li>$1</li>')
              .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
              .replace(/^\|(.*)\|$/gm, (match) => {
                const cells = match.split('|').filter(c => c.trim());
                if (cells[0]?.includes('---')) return '';
                const tag = match.includes('---') ? 'th' : 'td';
                return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
              })
              .replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/^(?!<[a-z])/gm, '<p>')
              .replace(/(?<![>])$/gm, '</p>')
              .replace(/<p><\/p>/g, '')
              .replace(/<p>(<[hupol])/g, '$1')
              .replace(/(<\/[hupol].*?>)<\/p>/g, '$1')
            || ''
          }} />
        </article>

        {/* Navigation */}
        <div className="docs-pagination">
          {(() => {
            const allItems = DOCS_STRUCTURE.flatMap(s => s.items);
            const currentIndex = allItems.findIndex(i => i.id === activeSection);
            const prev = allItems[currentIndex - 1];
            const next = allItems[currentIndex + 1];
            
            return (
              <>
                {prev && (
                  <button className="docs-page-link prev" onClick={() => handleNavClick(prev.id)}>
                    <span className="docs-page-label">Previous</span>
                    <span className="docs-page-title">{prev.title}</span>
                  </button>
                )}
                {next && (
                  <button className="docs-page-link next" onClick={() => handleNavClick(next.id)}>
                    <span className="docs-page-label">Next</span>
                    <span className="docs-page-title">{next.title}</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
}