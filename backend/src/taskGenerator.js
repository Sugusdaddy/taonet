const Task = require("./models/Task");
const Knowledge = require("./models/Knowledge");

// Difficulty tiers
const DIFFICULTY_TIERS = [
  { id: 'novice', level: 1, name: 'Novice', rewardMult: 1.0, xpMult: 1.0, maxTokens: 50 },
  { id: 'apprentice', level: 3, name: 'Apprentice', rewardMult: 1.5, xpMult: 1.3, maxTokens: 100 },
  { id: 'journeyman', level: 5, name: 'Journeyman', rewardMult: 2.0, xpMult: 1.6, maxTokens: 200 },
  { id: 'expert', level: 8, name: 'Expert', rewardMult: 3.0, xpMult: 2.0, maxTokens: 300 },
  { id: 'master', level: 12, name: 'Master', rewardMult: 5.0, xpMult: 2.5, maxTokens: 500 },
  { id: 'grandmaster', level: 20, name: 'Grandmaster', rewardMult: 10.0, xpMult: 3.0, maxTokens: 1000 }
];

function getDifficultyForLevel(level) {
  for (let i = DIFFICULTY_TIERS.length - 1; i >= 0; i--) {
    if (level >= DIFFICULTY_TIERS[i].level) return DIFFICULTY_TIERS[i];
  }
  return DIFFICULTY_TIERS[0];
}

// Solana prompts by category
const SOLANA_PROMPTS = {
  basics: [
    "What is Solana and how does it achieve high throughput?",
    "Explain Proof of History and how it differs from other consensus mechanisms",
    "What are accounts in Solana? Explain the account model",
    "Describe program accounts vs data accounts in Solana",
    "What is rent in Solana and rent exemption?",
    "Explain the Solana transaction lifecycle step by step",
    "What are Program Derived Addresses (PDAs) and why are they useful?",
    "How does Solana achieve 400ms block times?",
    "What is the role of validators and how does staking work?",
    "Explain Sealevel and parallel transaction processing",
    "What is the difference between Solana mainnet-beta and devnet?",
    "Explain lamports and SOL denomination",
    "What are compute units and compute budget in Solana?",
    "How do transaction fees work on Solana?",
    "What is the Solana runtime and how does it execute programs?",
  ],
  anchor: [
    "Write a complete Anchor program for a counter with increment and decrement",
    "Explain #[account] attribute and account constraints in Anchor",
    "How do you implement #[derive(Accounts)] with all constraint types?",
    "Write an Anchor instruction to transfer SOL between accounts",
    "How do you handle custom errors in Anchor programs?",
    "Create an Anchor voting program with proposals and votes",
    "Explain init, init_if_needed, realloc, and close in Anchor",
    "Write comprehensive Anchor tests with TypeScript",
    "Create an Anchor NFT minting program",
    "Explain seeds, bumps, and PDA derivation in Anchor",
    "Implement Cross-Program Invocation (CPI) in Anchor",
    "Build an Anchor escrow program with timelock",
    "How do you upgrade Anchor programs safely?",
    "Explain declare_id! and program deployment",
    "Write complex account constraints with has_one and constraint",
    "Implement a multisig program in Anchor",
    "How do you handle optional accounts in Anchor?",
    "Create an Anchor program with events and logging",
    "Explain Anchor's AccountLoader for zero-copy deserialization",
    "Build a staking program in Anchor",
  ],
  rust: [
    "Write a native Solana program to transfer SOL without Anchor",
    "How do you deserialize instruction data in native Solana Rust?",
    "Explain borsh serialization and implement custom serialization",
    "Write Rust code to create and verify a PDA",
    "Implement multiple signers verification in Solana Rust",
    "Create a key-value store program in native Rust",
    "Explain the entrypoint! macro and program structure",
    "How do you use msg! and sol_log for debugging?",
    "Write Rust code to create a new account with system program",
    "Explain invoke and invoke_signed for CPIs",
    "Implement account reallocation in native Rust",
    "How do you handle account ownership verification?",
    "Write a native Rust program for token transfers",
    "Explain pack and unpack traits for account data",
    "Implement a native Rust program with PDAs",
  ],
  tokens: [
    "How do you create an SPL token with custom decimals?",
    "Write complete code to mint SPL tokens to multiple wallets",
    "Explain Token Program vs Token-2022 and when to use each",
    "How do you create and manage Associated Token Accounts?",
    "Write a function to transfer SPL tokens with memo",
    "What are token extensions in Token-2022? List and explain them",
    "How do you burn SPL tokens and close token accounts?",
    "Explain token metadata standards and Metaplex integration",
    "Create a token with transfer fees using Token-2022",
    "How do you freeze and thaw token accounts?",
    "Implement a token vesting program",
    "How do you create a token with permanent delegate?",
    "Explain confidential transfers in Token-2022",
    "Write code to fetch all token accounts for a wallet",
    "How do you implement token-gating for access control?",
  ],
  nfts: [
    "Write complete code to mint an NFT using Metaplex",
    "Explain Candy Machine v3 configuration and deployment",
    "How do you fetch and display NFT metadata and images?",
    "Create an NFT collection with verified collection address",
    "Explain compressed NFTs and state compression",
    "How do you verify NFT creators and royalties?",
    "Write code to transfer NFTs between wallets",
    "Explain Token Metadata Program instructions",
    "How do you update NFT metadata after minting?",
    "Implement royalty enforcement with pNFTs",
    "How do you build an NFT marketplace on Solana?",
    "Explain Bubblegum for compressed NFT operations",
    "Write code to list NFTs from a collection",
    "How do you implement NFT staking?",
    "Create a generative art NFT with on-chain randomness",
  ],
  defi: [
    "How does Jupiter aggregator routing work internally?",
    "Explain Raydium AMM architecture and liquidity pools",
    "Write complete code to swap tokens using Jupiter SDK",
    "How do you create a liquidity pool on Orca Whirlpools?",
    "Explain Marinade liquid staking and mSOL mechanics",
    "Build a DeFi vault program with yield strategies",
    "Write code to fetch real-time prices from Pyth Network",
    "Explain flash loans on Solana and implement one",
    "How do you build a lending protocol like Solend?",
    "Explain Drift Protocol perpetuals and orderbook",
    "Implement a constant product AMM from scratch",
    "How do you integrate with Switchboard oracles?",
    "Write code for limit orders using Serum/OpenBook",
    "Explain impermanent loss and LP token mechanics",
    "Build an options protocol on Solana",
  ],
  web3js: [
    "How do you connect to Solana with different commitment levels?",
    "Write code to get SOL balance and all token balances",
    "How do you build and send versioned transactions?",
    "Explain Connection methods and when to use each",
    "Write code to subscribe to account changes in real-time",
    "How do you integrate wallet adapters in a React app?",
    "Create a complete airdrop function for devnet testing",
    "How do you fetch and parse transaction history?",
    "Write code to decode instruction data from transactions",
    "Explain Keypair generation and security best practices",
    "How do you implement transaction retry logic?",
    "Write code to simulate transactions before sending",
    "Explain address lookup tables and implementation",
    "How do you handle RPC errors and rate limits?",
    "Create a transaction builder utility class",
  ],
  security: [
    "What are the top 10 vulnerabilities in Solana programs?",
    "How do you prevent and detect reentrancy attacks?",
    "Explain signer verification patterns and common mistakes",
    "What is account confusion and how to prevent it?",
    "How do you perform a security audit on Solana programs?",
    "Explain owner and authority checks best practices",
    "What are arithmetic overflow risks and safe math?",
    "How do you secure PDAs against manipulation?",
    "Explain missing signer check vulnerabilities with examples",
    "What tools exist for Solana security auditing?",
    "How do you implement access control patterns?",
    "Explain bump seed canonicalization attacks",
    "What is account data matching and validation?",
    "How do you handle untrusted input safely?",
    "Explain closing accounts securely to prevent exploits",
  ],
  optimization: [
    "How do you minimize compute units in Solana programs?",
    "Explain transaction size limits and workarounds",
    "How do you reduce account size for lower rent costs?",
    "What is the best way to batch multiple operations?",
    "How do you use address lookup tables effectively?",
    "Explain priority fees and dynamic fee strategies",
    "How do you optimize RPC calls for performance?",
    "What are versioned transactions and their benefits?",
    "How do you handle rate limits from RPC providers?",
    "Explain efficient getProgramAccounts with filters",
    "How do you implement pagination for large datasets?",
    "What are zero-copy accounts and when to use them?",
    "How do you optimize client-side transaction building?",
    "Explain compute budget optimization techniques",
    "How do you reduce transaction latency?",
  ],
  advanced: [
    "How do you build a production Solana indexer?",
    "Explain Clockwork/Automation for scheduled transactions",
    "How do you implement a DAO with governance on Solana?",
    "Design a prediction market protocol architecture",
    "How do you build cross-chain bridges with Wormhole?",
    "Explain Wormhole message passing and VAAs",
    "How do you implement gasless/sponsored transactions?",
    "What is Neon EVM and how to deploy Solidity contracts?",
    "How do you build Solana mobile dApps with SMS?",
    "Explain Blinks, Actions, and transaction requests",
    "How do you implement account compression?",
    "Build a social protocol on Solana",
    "How do you handle high-frequency trading on Solana?",
    "Explain geyser plugins and custom RPC",
    "How do you build a Solana validator?",
  ]
};

class TaskGenerator {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.tasksGenerated = 0;
    this.usedPrompts = new Set();
    this.allPrompts = this.buildPromptList();
    this.promptIndex = 0;
  }

  buildPromptList() {
    const list = [];
    for (const [category, prompts] of Object.entries(SOLANA_PROMPTS)) {
      for (const prompt of prompts) {
        list.push({ prompt, category });
      }
    }
    // Shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  async getNextPrompt(minerLevel) {
    // First check if we have unanswered questions in knowledge base
    const unanswered = await Knowledge.findOne({ 
      answer: { $exists: false } 
    }).sort({ createdAt: 1 });
    
    if (unanswered) {
      return { prompt: unanswered.question, category: unanswered.category || 'general', fromKnowledge: true };
    }

    // Get next unused prompt from shuffled list
    let attempts = 0;
    while (attempts < this.allPrompts.length) {
      const item = this.allPrompts[this.promptIndex];
      this.promptIndex = (this.promptIndex + 1) % this.allPrompts.length;
      
      // Check if this exact prompt was already answered
      const exists = await Knowledge.findOne({ 
        questionLower: item.prompt.toLowerCase() 
      });
      
      if (!exists) {
        return item;
      }
      attempts++;
    }
    
    // All prompts answered, reset and add variations
    console.log("[TaskGen] All prompts answered! Cycling with variations...");
    this.promptIndex = 0;
    const item = this.allPrompts[Math.floor(Math.random() * this.allPrompts.length)];
    return { 
      prompt: `${item.prompt} (provide a detailed example)`, 
      category: item.category 
    };
  }

  async createAndBroadcastTask() {
    try {
      const wss = global.wss;
      if (!wss) return null;
      
      const availableMiners = [];
      wss.clients.forEach(client => {
        if (client.readyState === 1 && client.minerAddress && !client.isBusy) {
          availableMiners.push(client);
        }
      });
      
      if (availableMiners.length === 0) {
        console.log(`[TaskGen] 0 miners available`);
        return null;
      }
      
      console.log(`[TaskGen] ${availableMiners.length} miners ready`);
      
      for (const miner of availableMiners) {
        const minerLevel = miner.minerLevel || 1;
        const { prompt, category } = await this.getNextPrompt(minerLevel);
        const difficulty = getDifficultyForLevel(minerLevel);
        
        const task = new Task({
          type: "text",
          prompt,
          difficulty: difficulty.id,
          difficultyName: difficulty.name,
          rewardMultiplier: difficulty.rewardMult,
          xpMultiplier: difficulty.xpMult,
          requester: "solana_training",
          rewardPool: (BigInt("1000000000000000000") * BigInt(Math.floor(difficulty.rewardMult * 10)) / 10n).toString(),
          priority: 0,
          status: "assigned",
          assignedMiner: miner.minerAddress,
          assignedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          options: { category, maxTokens: difficulty.maxTokens }
        });
        
        await task.save();
        
        miner.isBusy = true;
        miner.currentTaskId = task._id.toString();
        
        miner.send(JSON.stringify({
          type: "task",
          task: {
            id: task._id.toString(),
            _id: task._id.toString(),
            prompt: task.prompt,
            taskType: "text",
            difficulty: difficulty.name,
            maxTokens: difficulty.maxTokens
          }
        }));
        
        console.log(`[TaskGen] [${category}] "${prompt.slice(0,50)}..." -> ${miner.minerAddress.slice(0,8)}`);
        this.tasksGenerated++;
      }
      
      return true;
    } catch (error) {
      console.error("[TaskGen] Error:", error.message);
      return null;
    }
  }

  start(intervalMs = 3000) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[TaskGen] Started - Solana training - ${intervalMs/1000}s interval`);
    console.log(`[TaskGen] ${this.allPrompts.length} unique prompts loaded`);
    
    setTimeout(() => this.createAndBroadcastTask(), 2000);
    this.interval = setInterval(() => this.createAndBroadcastTask(), intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    console.log("[TaskGen] Stopped");
  }

  getStatus() {
    return { 
      isRunning: this.isRunning, 
      tasksGenerated: this.tasksGenerated, 
      totalPrompts: this.allPrompts.length,
      promptIndex: this.promptIndex
    };
  }
}

module.exports = new TaskGenerator();
