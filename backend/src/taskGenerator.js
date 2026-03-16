const Task = require("./models/Task");
const TaskDifficulty = require("./services/taskDifficulty");

// Solana-focused training prompts organized by category
const SOLANA_PROMPTS = {
  basics: [
    "What is Solana and how does it differ from Ethereum?",
    "Explain Solana's Proof of History consensus mechanism",
    "What are accounts in Solana and how do they work?",
    "Describe the difference between program accounts and data accounts",
    "What is rent in Solana and how does it work?",
    "Explain the Solana transaction lifecycle",
    "What are Program Derived Addresses (PDAs)?",
    "How does Solana achieve 400ms block times?",
    "What is the role of validators in Solana?",
    "Explain Solana's parallel transaction processing with Sealevel",
  ],
  anchor: [
    "Write a basic Anchor program with a counter",
    "How do you define accounts in Anchor using #[account]?",
    "Explain the #[derive(Accounts)] macro in Anchor",
    "Write an Anchor instruction to transfer SOL",
    "How do you handle errors in Anchor programs?",
    "Create an Anchor program for a simple voting system",
    "Explain init, init_if_needed, and realloc in Anchor",
    "How do you test Anchor programs with TypeScript?",
    "Write an Anchor program to mint an NFT",
    "Explain seeds and bumps in Anchor PDAs",
    "How do you do Cross-Program Invocations (CPI) in Anchor?",
    "Create an Anchor escrow program",
    "How do you upgrade an Anchor program?",
    "Explain the declare_id! macro",
    "Write account constraints in Anchor",
  ],
  rust: [
    "Write a Solana program in native Rust to transfer SOL",
    "How do you deserialize account data in Solana Rust?",
    "Explain borsh serialization in Solana",
    "Write a Rust function to verify a PDA",
    "How do you handle multiple signers in Solana Rust?",
    "Create a Solana program to store key-value data",
    "Explain the entrypoint macro in Solana",
    "How do you log messages in Solana programs?",
    "Write Rust code to create a new account",
    "Explain invoke and invoke_signed in Solana",
  ],
  tokens: [
    "How do you create an SPL token?",
    "Write code to mint SPL tokens to a wallet",
    "Explain the Token Program vs Token-2022",
    "How do you create an Associated Token Account?",
    "Write a function to transfer SPL tokens",
    "What are token extensions in Token-2022?",
    "How do you burn SPL tokens?",
    "Explain token metadata and Metaplex",
    "Create a token with transfer fees using Token-2022",
    "How do you freeze a token account?",
  ],
  nfts: [
    "How do you mint an NFT on Solana using Metaplex?",
    "Explain the Metaplex Candy Machine",
    "Write code to fetch NFT metadata",
    "How do you create an NFT collection?",
    "Explain compressed NFTs on Solana",
    "How do you verify an NFT's creator?",
    "Write code to transfer an NFT",
    "What is the Metaplex Token Metadata program?",
    "How do you update NFT metadata?",
    "Explain royalties enforcement on Solana NFTs",
  ],
  defi: [
    "How does Jupiter aggregator work?",
    "Explain Raydium's AMM architecture",
    "Write code to swap tokens using Jupiter SDK",
    "How do you create a liquidity pool on Orca?",
    "Explain Marinade's liquid staking",
    "How do you build a DeFi vault on Solana?",
    "Write code to fetch token prices from Pyth",
    "Explain flash loans on Solana",
    "How do you implement a lending protocol?",
    "What is Drift Protocol and how does it work?",
  ],
  web3js: [
    "How do you connect to Solana using @solana/web3.js?",
    "Write code to get account balance",
    "How do you send a transaction with web3.js?",
    "Explain Connection and commitment levels",
    "Write code to subscribe to account changes",
    "How do you sign transactions with a wallet adapter?",
    "Create a function to airdrop devnet SOL",
    "How do you fetch transaction history?",
    "Write code to parse transaction instructions",
    "Explain the Keypair class in web3.js",
  ],
  security: [
    "What are common vulnerabilities in Solana programs?",
    "How do you prevent reentrancy attacks?",
    "Explain signer verification best practices",
    "What is account confusion and how to prevent it?",
    "How do you audit a Solana smart contract?",
    "Explain the importance of checking account ownership",
    "What are arithmetic overflow risks in Solana?",
    "How do you secure PDAs properly?",
    "Explain the risks of missing signer checks",
    "What tools exist for Solana security auditing?",
  ],
  optimization: [
    "How do you optimize compute units in Solana?",
    "Explain transaction size limits and how to work around them",
    "How do you reduce account size for lower rent?",
    "What is the best way to batch transactions?",
    "How do you use lookup tables for optimization?",
    "Explain priority fees and when to use them",
    "How do you optimize RPC calls?",
    "What are versioned transactions?",
    "How do you handle rate limits from RPC providers?",
    "Explain the benefits of using getProgramAccounts efficiently",
  ],
  advanced: [
    "How do you build a Solana indexer?",
    "Explain Clockwork for on-chain automation",
    "How do you implement a DAO on Solana?",
    "Write a Solana program for a prediction market",
    "How do you build cross-chain bridges?",
    "Explain Wormhole integration",
    "How do you implement gasless transactions?",
    "What is Neon EVM and how does it work?",
    "How do you build a Solana mobile app with SMS?",
    "Explain Blinks and Solana Actions",
  ]
};

// Flatten all prompts
const ALL_PROMPTS = Object.values(SOLANA_PROMPTS).flat();

class TaskGenerator {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.taskIndex = 0;
    this.tasksGenerated = 0;
  }

  getRandomPrompt() {
    return ALL_PROMPTS[Math.floor(Math.random() * ALL_PROMPTS.length)];
  }

  getPromptByCategory(category) {
    const prompts = SOLANA_PROMPTS[category];
    if (!prompts) return this.getRandomPrompt();
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  getCategoryForLevel(level) {
    if (level < 3) return 'basics';
    if (level < 5) return ['basics', 'web3js', 'tokens'][Math.floor(Math.random() * 3)];
    if (level < 8) return ['anchor', 'rust', 'tokens', 'nfts'][Math.floor(Math.random() * 4)];
    if (level < 12) return ['anchor', 'defi', 'security'][Math.floor(Math.random() * 3)];
    return ['advanced', 'optimization', 'security', 'defi'][Math.floor(Math.random() * 4)];
  }

  async createAndBroadcastTask() {
    try {
      const wss = global.wss;
      if (!wss) return null;
      
      // Find connected miners that are READY
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
      
      console.log(`[TaskGen] ${availableMiners.length} miners available, generating tasks...`);
      
      // Generate task for EACH available miner
      const tasks = [];
      for (const miner of availableMiners) {
        const minerLevel = miner.minerLevel || 1;
        const category = this.getCategoryForLevel(minerLevel);
        const prompt = this.getPromptByCategory(category);
        const difficulty = TaskDifficulty.getDifficultyForLevel(minerLevel);
        
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
          expiresAt: new Date(Date.now() + 60 * 1000),
          options: { category, maxTokens: difficulty.maxTokens }
        });
        
        await task.save();
        
        // Mark miner as busy
        miner.isBusy = true;
        miner.currentTaskId = task._id.toString();
        
        // Send task
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
        
        console.log(`[TaskGen] [${difficulty.name}] "${prompt.slice(0,50)}..." -> ${miner.minerAddress.slice(0,8)}`);
        this.tasksGenerated++;
        tasks.push(task);
      }
      
      return tasks;
    } catch (error) {
      console.error("[TaskGen] Error:", error.message);
      return null;
    }
  }

  start(intervalMs = 3000) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`[TaskGen] Started - Solana training mode - interval ${intervalMs/1000}s`);
    console.log(`[TaskGen] ${ALL_PROMPTS.length} unique Solana prompts loaded`);
    
    // First task after 2 seconds
    setTimeout(() => this.createAndBroadcastTask(), 2000);
    
    // Then every intervalMs
    this.interval = setInterval(() => {
      this.createAndBroadcastTask();
    }, intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("[TaskGen] Stopped");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      tasksGenerated: this.tasksGenerated,
      totalPrompts: ALL_PROMPTS.length,
      categories: Object.keys(SOLANA_PROMPTS)
    };
  }
}

module.exports = new TaskGenerator();
