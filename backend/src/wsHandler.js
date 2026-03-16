/**
 * TaoNet WebSocket Handler v2.5
 * With increased delays for production
 */

const Miner = require('./models/Miner');
const Task = require('./models/Task');
const Reward = require('./models/Reward');
const InferenceProof = require('./models/InferenceProof');
const RewardEngine = require('./services/rewardEngine');
const airdropService = require('./services/airdropService');

// Comprehensive AI responses database
const RESPONSES = {
  solana: [
    "Solana achieves high throughput through Proof of History (PoH), a cryptographic clock that timestamps transactions before they enter consensus. Each validator maintains a SHA-256 hash chain that proves time has passed, allowing the network to process transactions in parallel without waiting for global agreement on ordering. This enables 65,000+ TPS with sub-second finality.",
    "The Solana Program Library (SPL) uses an account-based model where token accounts are separate from the mint authority. Unlike ERC-20 where balances are stored in the token contract, SPL creates individual token accounts for each holder. Associated Token Accounts (ATAs) provide deterministic addresses, making token transfers more predictable.",
    "Gulf Stream eliminates the traditional mempool by forwarding transactions directly to the expected leader before the current block finalizes. Validators cache transactions and execute them speculatively, reducing confirmation times dramatically. This requires accurate leader schedule predictions but enables Solana's low latency.",
    "Sealevel is Solana's parallel smart contract runtime that processes thousands of transactions simultaneously. It identifies non-overlapping transactions by analyzing account dependencies - if two transactions touch different accounts, they execute in parallel across available cores. This contrasts sharply with EVM's sequential execution model.",
    "Program Derived Addresses (PDAs) are deterministic addresses generated from a program ID and seeds without a corresponding private key. They enable programs to sign transactions programmatically, creating trustless escrows, vaults, and cross-program interactions. PDAs are fundamental to Solana program architecture."
  ],
  defi: [
    "Impermanent loss occurs when the price ratio of pooled tokens diverges from the deposit ratio. For a 50/50 ETH/USDC pool, if ETH doubles in price, arbitrageurs rebalance the pool, leaving you with more USDC and less ETH than if you had simply held. The loss is 'impermanent' because it reverses if prices return to original ratios, but becomes permanent upon withdrawal.",
    "Flash loans enable uncollateralized borrowing within a single atomic transaction. The loan must be repaid before the transaction completes, or the entire transaction reverts. Use cases include: arbitrage across DEXs, collateral swaps to avoid liquidation, self-liquidation for profit, and governance attacks. The atomicity guarantees eliminate default risk for lenders.",
    "Concentrated liquidity in Uniswap V3 allows LPs to allocate capital to specific price ranges rather than the entire curve. This dramatically improves capital efficiency - a position concentrated around the current price can provide the same liquidity depth as 4000x more capital in V2. However, it requires active management and increases impermanent loss risk.",
    "Perpetual futures maintain exposure without expiry through funding rates that periodically transfer between longs and shorts. When perp price exceeds spot (contango), longs pay shorts, incentivizing shorts and pushing price down. This mechanism keeps perp prices anchored to spot without settlement or rolling positions.",
    "Protocol-owned liquidity (POL) means the protocol itself owns LP positions rather than renting them through emissions. Olympus DAO pioneered this with bonding mechanisms - users trade assets for discounted tokens, and the protocol permanently owns the liquidity. This creates sustainable liquidity without constant emission dilution."
  ],
  blockchain: [
    "Merkle trees hash transactions in pairs up to a single root, enabling efficient verification. To prove a transaction exists, you only need log(n) hashes - the siblings along the path to the root. This enables SPV (Simplified Payment Verification) for light clients and is crucial for rollup data availability proofs.",
    "The blockchain trilemma posits that decentralization, security, and scalability can't all be maximized simultaneously. Bitcoin and Ethereum prioritize decentralization and security at the cost of throughput. Solana trades some decentralization (higher hardware requirements) for scalability. Layer 2s attempt to achieve all three by inheriting L1 security while processing transactions off-chain.",
    "Zero-knowledge rollups batch transactions off-chain and generate cryptographic proofs of valid execution. The L1 only verifies the proof (constant time) rather than re-executing transactions. This provides immediate finality once the proof is verified, unlike optimistic rollups which require challenge periods. The tradeoff is proof generation complexity and cost.",
    "Probabilistic finality (Bitcoin, Nakamoto consensus) means transaction security increases with each confirmation but is never absolute. Deterministic finality (Tendermint, Solana) means once a block is confirmed, it cannot be reverted without breaking consensus rules. The tradeoff is that deterministic finality requires more coordination and can halt if validators disagree.",
    "Data availability ensures that block data is actually published and retrievable, not just committed to. This is critical for rollups - if a sequencer withholds data, users can't reconstruct state or prove fraud. Solutions include data availability committees, erasure coding (Celestia), and danksharding (Ethereum's EIP-4844)."
  ],
  security: [
    "Reentrancy attacks exploit external calls that transfer control before state updates. The classic example is calling a malicious contract's fallback function during withdrawal, which calls back into withdraw() before the balance is zeroed. Prevention: checks-effects-interactions pattern, reentrancy guards, or pull payments instead of push.",
    "MEV (Maximal Extractable Value) represents profit from transaction ordering, insertion, or censorship. Searchers identify profitable opportunities - arbitrage, liquidations, sandwich attacks - and bid for favorable ordering. Flashbots created private mempools to reduce negative externalities. MEV extraction is estimated at hundreds of millions annually.",
    "Oracle manipulation attacks exploit price feeds to extract value. Flash loan attacks borrow large amounts to manipulate spot prices on low-liquidity DEXs, then use the manipulated price in lending protocols for profitable liquidations or borrowing. Mitigations include TWAP oracles, multiple oracle sources, and borrowing limits.",
    "Sandwich attacks front-run large swaps with a buy, then back-run with a sell after the victim's trade moves the price. The attacker profits from the price impact they created. Users can mitigate with low slippage tolerance, private transactions (Flashbots Protect), or DEXs with MEV protection.",
    "Smart contract audits examine code for vulnerabilities, logic errors, and economic attack vectors. However, audits are point-in-time assessments that can't guarantee security - many exploited protocols had multiple audits. Defense in depth requires: audits, formal verification where possible, bug bounties, gradual rollouts, and monitoring systems."
  ],
  nft: [
    "ERC-721 defines each token as unique with distinct metadata, while ERC-1155 supports both fungible and non-fungible tokens in a single contract. ERC-1155 enables efficient batch transfers (one transaction for multiple items) and reduces deployment costs for collections with both unique and semi-fungible items like game assets.",
    "Soulbound tokens (SBTs) are non-transferable NFTs representing credentials, reputation, or identity. Unlike regular NFTs, they can't be sold or transferred after minting. Use cases include: academic credentials, employment history, credit scores, DAO membership, and participation badges. The challenge is recovery mechanisms for lost wallets.",
    "NFT metadata can be stored on-chain (expensive but permanent), on IPFS (content-addressed but requires pinning), on Arweave (permanent with upfront cost), or on centralized servers (cheap but fragile). Most NFTs use IPFS with the hash stored on-chain. Fully on-chain NFTs store SVG or data directly in the contract.",
    "Compressed NFTs on Solana use Merkle trees to store NFT data off-chain while keeping only the root on-chain. This reduces minting costs from ~$2 to fractions of a cent, enabling million-item collections. The tradeoff is that transfers require Merkle proofs and RPC nodes must index the tree data.",
    "NFT royalties were historically enforced socially - marketplaces honored creator fees voluntarily. As zero-royalty marketplaces emerged, protocols like Blur and OpenSea introduced enforcement mechanisms. Newer standards attempt on-chain enforcement through transfer hooks or allowlisted marketplaces, though enforcement remains imperfect."
  ],
  governance: [
    "Quadratic voting weights votes by the square root of tokens committed, so 100 tokens give 10 votes rather than 100. This makes it exponentially expensive to dominate outcomes - one whale with 10,000 tokens (100 votes) has less power than 100 users with 100 tokens each (1,000 total votes). It better represents preference intensity while limiting plutocracy.",
    "Conviction voting accumulates voting power over time - the longer you support a proposal, the more weight your vote carries. This favors genuine long-term preferences over last-minute whale manipulation and allows continuous, fluid governance without discrete voting periods. Projects like Giveth and 1Hive use this model.",
    "Governance tokens face the plutocracy problem where large holders control outcomes. Mitigations include: quadratic voting, delegation systems to spread influence, time-weighted voting (longer holders get more weight), rage quit mechanisms to protect minorities, and governance minimization to reduce attack surface.",
    "Vote delegation allows token holders to assign voting power to representatives without transferring tokens. This enables more informed voting (delegates can specialize) and higher participation (passive holders can still influence). Compound and ENS popularized delegation with public delegate platforms and statements.",
    "Optimistic governance assumes proposals pass unless challenged, reducing voting fatigue. Only controversial proposals require active voting. This works well for routine decisions but requires careful design of challenge mechanisms, collateral requirements, and escalation paths for high-stakes decisions."
  ],
  layer2: [
    "Optimistic rollups assume transactions are valid and only verify if challenged. A fraud proof window (typically 7 days) allows anyone to prove invalid state transitions. If fraud is proven, the invalid batch is reverted and the sequencer is slashed. This enables EVM compatibility but requires long withdrawal periods.",
    "ZK-rollups generate cryptographic proofs of valid execution, verified on L1 in constant time regardless of transaction count. Proofs take minutes to generate but provide instant finality once verified. Different proving systems (SNARKs, STARKs) offer tradeoffs between proof size, generation time, and setup requirements.",
    "Sequencers in rollups order and batch transactions for submission to L1. Most rollups currently use centralized sequencers for performance, creating censorship and MEV concerns. Decentralized sequencer solutions include leader rotation, shared sequencing networks (Espresso), and based rollups that use L1 validators.",
    "EIP-4844 (Proto-Danksharding) introduces blob-carrying transactions - large data blobs with separate fee markets. Rollups can post data in blobs at ~10x lower cost than calldata. Blobs are pruned after ~2 weeks since they're only needed for data availability, not permanent storage.",
    "Based rollups use L1 validators as sequencers rather than running separate sequencer sets. Transactions are ordered by L1 block builders, inheriting L1's decentralization and censorship resistance. The tradeoff is higher latency (L1 block times) and less flexibility in transaction ordering."
  ],
  ai: [
    "Decentralized AI training distributes model training across multiple nodes, each processing data subsets. Blockchain can coordinate nodes, verify contributions, and distribute rewards. Challenges include: communication overhead for gradient synchronization, data privacy, quality verification, and the need for specialized hardware.",
    "Proof of useful work replaces arbitrary hash computation with AI training or inference. Nodes perform meaningful computation and prove their work cryptographically. Projects like Gensyn and Together explore this model, though verifying AI work is complex compared to hash verification.",
    "AI agents can interact with blockchains through tool use - calling contract functions, managing wallets, participating in DeFi. Challenges include: gas management, transaction signing security, handling failures gracefully, and preventing agents from being exploited through prompt injection.",
    "On-chain machine learning is limited by gas costs and computation constraints. Simple models like linear regression are feasible, but neural networks are prohibitively expensive. Most AI+blockchain projects keep computation off-chain and use blockchain for coordination, payments, and verification.",
    "Zero-knowledge proofs for AI inference allow proving that a specific model produced an output without revealing the model weights or input data. This enables verifiable AI services - users can confirm they received outputs from a specific model without the provider exposing proprietary models."
  ],
  default: [
    "Blockchain technology creates trustless systems where participants transact without intermediaries. Cryptographic proofs, distributed consensus, and economic incentives ensure transparency, immutability, and censorship resistance. The innovation isn't any single component but their combination into a coherent system.",
    "Smart contracts are self-executing programs that enforce agreements automatically when conditions are met. They eliminate counterparty risk for digital interactions - the code executes regardless of whether parties want to comply. This enables DeFi, DAOs, NFTs, and countless applications impossible with traditional contracts.",
    "Decentralized finance (DeFi) replaces financial intermediaries with open protocols. Users maintain asset custody while accessing lending, trading, and derivatives. The composability of DeFi - protocols building on each other - creates novel financial instruments impossible in traditional finance.",
    "Web3 represents an internet where users own their data, identity, and assets through cryptographic keys rather than platform accounts. While the vision is compelling, current Web3 faces UX challenges, scalability limits, and questions about true decentralization versus recreating centralized power structures.",
    "Tokenomics design determines how a protocol creates, distributes, and captures value. Key considerations include: supply schedule (inflation/deflation), distribution fairness (pre-mine vs fair launch), utility mechanisms (staking, governance, fees), and value accrual (buybacks, burns, revenue sharing)."
  ]
};


// Task cooldown tracking - 5 second minimum between tasks per miner
const minerCooldowns = new Map();
const TASK_COOLDOWN_MS = 15000; // 15 seconds between tasks // 5 seconds between tasks

function getResponse(prompt) {
  const lower = prompt.toLowerCase();
  let category = 'default';
  
  if (lower.includes('solana') || lower.includes('spl') || lower.includes('gulf') || lower.includes('sealevel') || lower.includes('anchor') || lower.includes('pda')) {
    category = 'solana';
  } else if (lower.includes('defi') || lower.includes('liquidity') || lower.includes('flash loan') || lower.includes('amm') || lower.includes('yield') || lower.includes('impermanent') || lower.includes('lending') || lower.includes('stablecoin')) {
    category = 'defi';
  } else if (lower.includes('merkle') || lower.includes('trilemma') || lower.includes('rollup') || lower.includes('proof of') || lower.includes('consensus') || lower.includes('finality') || lower.includes('shard')) {
    category = 'blockchain';
  } else if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('multi-sig') || lower.includes('mev') || lower.includes('attack') || lower.includes('audit') || lower.includes('exploit')) {
    category = 'security';
  } else if (lower.includes('nft') || lower.includes('erc-721') || lower.includes('erc-1155') || lower.includes('soulbound') || lower.includes('metadata') || lower.includes('royalt')) {
    category = 'nft';
  } else if (lower.includes('governance') || lower.includes('dao') || lower.includes('voting') || lower.includes('quadratic') || lower.includes('delegate')) {
    category = 'governance';
  } else if (lower.includes('layer 2') || lower.includes('l2') || lower.includes('optimistic') || lower.includes('zk-') || lower.includes('sequencer') || lower.includes('4844')) {
    category = 'layer2';
  } else if (lower.includes('ai ') || lower.includes('machine learning') || lower.includes('neural') || lower.includes('training') || lower.includes('inference') || lower.includes('llm')) {
    category = 'ai';
  }
  
  const responses = RESPONSES[category];
  return responses[Math.floor(Math.random() * responses.length)];
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function handleAuth(ws, data, activeMiners) {
  try {
    const address = data.address;
    if (!address) {
      ws.send(JSON.stringify({ type: 'error', message: 'Address required' }));
      return;
    }

    let miner = await Miner.findOne({ address });
    if (!miner) {
      miner = new Miner({ address, name: address.slice(0, 8) });
      await miner.save();
    }

    miner.status = 'online';
    miner.lastSeen = new Date();
    await miner.save();

    ws.minerAddress = address;
    ws.minerName = miner.name;
    ws.isBackendMode = data.capabilities?.backend || !data.capabilities?.gpu;
    
    activeMiners.set(address, { ws, address, name: miner.name, isBackendMode: ws.isBackendMode });

    ws.send(JSON.stringify({
      type: 'auth_success',
      miner: { name: miner.name, level: miner.level, xp: miner.xp }
    }));

    console.log(`[WS] Miner authenticated: ${miner.name}`);
  } catch (error) {
    console.error('[WS] Auth error:', error.message);
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
  }
}

async function handleReady(ws) {
  try {
    // Check cooldown - 5 second minimum between tasks
    const lastTaskTime = minerCooldowns.get(ws.minerAddress) || 0;
    const timeSinceLastTask = Date.now() - lastTaskTime;
    
    if (timeSinceLastTask < TASK_COOLDOWN_MS) {
      const waitTime = Math.ceil((TASK_COOLDOWN_MS - timeSinceLastTask) / 1000);
      ws.send(JSON.stringify({ 
        type: 'cooldown', 
        message: 'Please wait ' + waitTime + 's before next task',
        waitMs: TASK_COOLDOWN_MS - timeSinceLastTask
      }));
      return;
    }
    
    const task = await Task.findOne({ status: 'pending' }).sort({ priority: -1, createdAt: 1 });
    
    if (task) {
      task.status = 'assigned';
      task.assignedMiner = ws.minerAddress;
      task.assignedAt = new Date();
      await task.save();
      
      ws.currentTaskId = task._id;
      
      ws.send(JSON.stringify({
        type: 'task',
        task: {
          id: task._id,
          _id: task._id,
          prompt: task.prompt,
          difficulty: task.difficulty,
          difficultyName: task.difficultyName,
          rewardMultiplier: task.rewardMultiplier,
          maxTokens: task.params?.maxTokens || 300
        }
      }));
      
      console.log(`[WS] Task assigned: ${task.difficulty} -> ${ws.minerName}`);
    }
  } catch (error) {
    console.error('[WS] Ready error:', error.message);
  }
}

async function handleTaskResponse(ws, data) {
  try {
    const taskId = data.taskId;
    
    let task = await Task.findById(taskId);
    if (!task) {
      ws.send(JSON.stringify({ type: 'error', message: 'Task not found' }));
      return;
    }

    // Generate intelligent response
    const response = data.response === '[SERVER_PROCESS]' ? getResponse(task.prompt) : data.response;
    const processingTime = 2000 + Math.random() * 3000; // 2-5 seconds
    const tokensGenerated = response.split(' ').length;

    // Simulate AI thinking delay
    await delay(1000);

    // Stream the response word by word with realistic typing delay
    const words = response.split(' ');
    for (let i = 0; i < words.length; i += 2) {
      const chunk = words.slice(i, i + 2).join(' ') + ' ';
      ws.send(JSON.stringify({
        type: 'task_stream',
        taskId: task._id,
        chunk,
        progress: Math.min(100, Math.round(((i + 2) / words.length) * 100))
      }));
      await delay(80 + Math.random() * 120); // 80-200ms per 2 words
    }

    // Processing complete - calculate reward
    const miner = await Miner.findOne({ address: ws.minerAddress });
    const baseReward = BigInt('1000000000000000000');
    const multipliedReward = BigInt(Math.floor(Number(baseReward) * (task.rewardMultiplier || 1)));
    
    const rewardResult = RewardEngine.calculateReward({
      baseReward: multipliedReward,
      miner,
      responseTime: processingTime,
      qualityScore: 80,
      taskType: task.type || 'text'
    });

    // Create reward
    const reward = new Reward({
      miner: ws.minerAddress,
      amount: rewardResult.finalReward.toString(),
      type: 'task',
      task: task._id,
      xpEarned: Math.round(rewardResult.xpEarned * (task.xpMultiplier || 1)),
      status: 'pending'
    });
    await reward.save();

    // Update miner
    const currentTotal = BigInt(miner?.stats?.totalRewards || '0');
    const newTotal = currentTotal + rewardResult.finalReward;
    
    await Miner.updateOne(
      { address: ws.minerAddress },
      {
        $inc: {
          xp: reward.xpEarned,
          'stats.completedTasks': 1
        },
        $set: { 
          lastSeen: new Date(),
          'stats.totalRewards': newTotal.toString()
        }
      }
    );

    // Create proof
    const proof = await InferenceProof.createProof(
      task._id,
      ws.minerAddress,
      task.prompt,
      response,
      { tokensGenerated, processingTimeMs: processingTime, model: 'TaoNet-AI' }
    );

    // Update task
    task.status = 'completed';
    minerCooldowns.set(ws.minerAddress, Date.now()); // Update cooldown
    task.completedAt = new Date();
    task.responses = [{ miner: ws.minerAddress, response, submittedAt: new Date() }];
    task.bestResponse = { miner: ws.minerAddress, response };
    await task.save();

    // Queue airdrop
    if (airdropService.initialized) {
      await airdropService.queueAirdrop(ws.minerAddress, rewardResult.finalReward, 'task', { taskId: task._id });
    }

    // Check level up
    const updatedMiner = await Miner.findOne({ address: ws.minerAddress });
    const xpNeeded = RewardEngine.getXpForLevel(updatedMiner.level + 1);
    let leveledUp = false;
    if (updatedMiner.xp >= xpNeeded) {
      updatedMiner.level += 1;
      await updatedMiner.save();
      leveledUp = true;
    }

    // Delay before completion to show result
    await delay(2000);

    // Send completion
    ws.send(JSON.stringify({
      type: 'task_accepted',
      taskId: task._id,
      response,
      proofId: proof._id,
      blockNumber: proof.blockNumber,
      reward: rewardResult.finalReward.toString(),
      xp: reward.xpEarned,
      level: updatedMiner.level,
      leveledUp,
      difficulty: task.difficulty
    }));

    console.log(`[WS] Block #${proof.blockNumber} | ${task.difficulty} | ${ws.minerName}`);
    ws.currentTaskId = null;

  } catch (error) {
    console.error('[WS] Task error:', error.message);
    ws.send(JSON.stringify({ type: 'error', message: 'Task processing failed' }));
  }
}

function setupWebSocket(wss) {
  const activeMiners = global.activeMiners || new Map();
  global.activeMiners = activeMiners;

  wss.on('connection', (ws) => {
    console.log('[WS] New connection');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        switch (data.type) {
          case 'auth': await handleAuth(ws, data, activeMiners); break;
          case 'heartbeat':
            if (ws.minerAddress) await Miner.updateOne({ address: ws.minerAddress }, { $set: { lastSeen: new Date() } });
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
            break;
          case 'ready': await handleReady(ws); break;
          case 'task_response':
          case 'response': await handleTaskResponse(ws, data); break;
        }
      } catch (error) {
        console.error('[WS] Error:', error.message);
      }
    });

    ws.on('close', async () => {
      if (ws.minerAddress) {
        activeMiners.delete(ws.minerAddress);
        await Miner.updateOne({ address: ws.minerAddress }, { $set: { status: 'offline' } });
        console.log(`[WS] Disconnected: ${ws.minerName}`);
      }
    });
  });

  return { activeMiners };
}

module.exports = { setupWebSocket };
