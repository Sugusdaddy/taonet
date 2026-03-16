const Task = require('../models/Task');

// Massive prompt database for AI training
const PROMPTS = [
  // === SOLANA ECOSYSTEM (50 prompts) ===
  { prompt: "Explain how Solana's Proof of History works and why it enables high throughput", type: "text", difficulty: "journeyman" },
  { prompt: "What are the key differences between Solana Program Library (SPL) tokens and Ethereum ERC-20 tokens?", type: "text", difficulty: "apprentice" },
  { prompt: "How does Solana's Gulf Stream protocol improve transaction processing?", type: "text", difficulty: "expert" },
  { prompt: "Describe the role of validators in Solana's consensus mechanism", type: "text", difficulty: "apprentice" },
  { prompt: "What is Sealevel and how does it enable parallel smart contract execution on Solana?", type: "text", difficulty: "expert" },
  { prompt: "Explain the Solana runtime and how programs interact with accounts", type: "text", difficulty: "master" },
  { prompt: "How do Solana's rent fees work and why are they important?", type: "text", difficulty: "journeyman" },
  { prompt: "What is the difference between Solana's devnet, testnet, and mainnet-beta?", type: "text", difficulty: "novice" },
  { prompt: "Explain how Solana handles account data storage and the account model", type: "text", difficulty: "expert" },
  { prompt: "What are Program Derived Addresses (PDAs) in Solana and when should you use them?", type: "text", difficulty: "master" },
  { prompt: "How does Solana's leader schedule work and how are validators selected?", type: "text", difficulty: "expert" },
  { prompt: "Explain the differences between Solana's native programs and user programs", type: "text", difficulty: "journeyman" },
  { prompt: "What is Turbine and how does it help Solana scale block propagation?", type: "text", difficulty: "expert" },
  { prompt: "How do Cross-Program Invocations (CPIs) work in Solana?", type: "text", difficulty: "master" },
  { prompt: "Explain how Solana handles transaction fees and priority fees", type: "text", difficulty: "apprentice" },
  { prompt: "What is the Solana Token Program and how do you create tokens?", type: "text", difficulty: "journeyman" },
  { prompt: "How does Solana's vote program work for consensus?", type: "text", difficulty: "expert" },
  { prompt: "Explain the Anchor framework for Solana development", type: "text", difficulty: "journeyman" },
  { prompt: "What are the security considerations when building Solana programs?", type: "text", difficulty: "master" },
  { prompt: "How do Associated Token Accounts work in Solana?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain Solana's Clockwork and how to schedule transactions", type: "text", difficulty: "expert" },
  { prompt: "What is Metaplex and how does it enable NFTs on Solana?", type: "text", difficulty: "journeyman" },
  { prompt: "How does Solana handle network congestion and what improvements have been made?", type: "text", difficulty: "expert" },
  { prompt: "Explain the Solana Mobile Stack and Saga phone integration", type: "text", difficulty: "journeyman" },
  { prompt: "What are Solana Actions and Blinks and how do they work?", type: "text", difficulty: "apprentice" },
  
  // === DEFI PROTOCOLS (50 prompts) ===
  { prompt: "Explain impermanent loss in liquidity pools with a practical example", type: "text", difficulty: "journeyman" },
  { prompt: "How do flash loans work and what are their legitimate use cases?", type: "text", difficulty: "expert" },
  { prompt: "Compare AMM (Automated Market Maker) vs order book DEX models", type: "text", difficulty: "journeyman" },
  { prompt: "What is yield farming and how do APY calculations work?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the concept of protocol-owned liquidity (POL)", type: "text", difficulty: "master" },
  { prompt: "How do lending protocols like Aave and Compound calculate interest rates?", type: "text", difficulty: "expert" },
  { prompt: "What are liquidations in DeFi and how do they maintain system solvency?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the constant product formula (x*y=k) used in Uniswap", type: "text", difficulty: "apprentice" },
  { prompt: "How do concentrated liquidity positions work in Uniswap V3?", type: "text", difficulty: "master" },
  { prompt: "What are perpetual futures in DeFi and how do funding rates work?", type: "text", difficulty: "expert" },
  { prompt: "Explain how decentralized stablecoins like DAI maintain their peg", type: "text", difficulty: "journeyman" },
  { prompt: "What is ve-tokenomics and how does vote escrow work?", type: "text", difficulty: "master" },
  { prompt: "How do liquidity bootstrapping pools (LBPs) work for token launches?", type: "text", difficulty: "expert" },
  { prompt: "Explain the risks of using leverage in DeFi protocols", type: "text", difficulty: "journeyman" },
  { prompt: "What are synthetic assets and how are they created in DeFi?", type: "text", difficulty: "expert" },
  { prompt: "How do options protocols like Lyra or Dopex work on-chain?", type: "text", difficulty: "master" },
  { prompt: "Explain the concept of capital efficiency in DeFi", type: "text", difficulty: "journeyman" },
  { prompt: "What are liquid staking derivatives and how do they work?", type: "text", difficulty: "apprentice" },
  { prompt: "How do cross-chain bridges transfer assets between blockchains?", type: "text", difficulty: "expert" },
  { prompt: "Explain the risks and security considerations of DeFi bridges", type: "text", difficulty: "master" },
  { prompt: "What is slippage and how can users minimize it when trading?", type: "text", difficulty: "novice" },
  { prompt: "How do DeFi aggregators like 1inch find the best swap routes?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain how Curve Finance optimizes for stablecoin swaps", type: "text", difficulty: "expert" },
  { prompt: "What are vault strategies and how do yield optimizers work?", type: "text", difficulty: "journeyman" },
  { prompt: "How do real-world assets (RWAs) get tokenized in DeFi?", type: "text", difficulty: "expert" },
  
  // === BLOCKCHAIN FUNDAMENTALS (50 prompts) ===
  { prompt: "How does a Merkle tree enable efficient verification in blockchains?", type: "text", difficulty: "journeyman" },
  { prompt: "Compare Proof of Work, Proof of Stake, and Delegated Proof of Stake", type: "text", difficulty: "apprentice" },
  { prompt: "What is the blockchain trilemma and how do different chains address it?", type: "text", difficulty: "expert" },
  { prompt: "Explain state channels and their role in scaling blockchains", type: "text", difficulty: "master" },
  { prompt: "How do zk-rollups achieve scalability while maintaining security?", type: "text", difficulty: "grandmaster" },
  { prompt: "What is the difference between optimistic and zk rollups?", type: "text", difficulty: "expert" },
  { prompt: "Explain how blockchain consensus prevents double spending", type: "text", difficulty: "apprentice" },
  { prompt: "What are sidechains and how do they relate to the main chain?", type: "text", difficulty: "journeyman" },
  { prompt: "How does sharding improve blockchain scalability?", type: "text", difficulty: "expert" },
  { prompt: "Explain the UTXO model vs the account model in blockchains", type: "text", difficulty: "journeyman" },
  { prompt: "What is finality in blockchain and how do different chains achieve it?", type: "text", difficulty: "expert" },
  { prompt: "How do light clients verify blockchain data without full nodes?", type: "text", difficulty: "master" },
  { prompt: "Explain the role of mempool in transaction processing", type: "text", difficulty: "apprentice" },
  { prompt: "What are blockchain oracles and why are they necessary?", type: "text", difficulty: "journeyman" },
  { prompt: "How does blockchain immutability work and what are its limitations?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the concept of blockchain forks - soft vs hard forks", type: "text", difficulty: "journeyman" },
  { prompt: "What is blockchain interoperability and how is it achieved?", type: "text", difficulty: "expert" },
  { prompt: "How do validity proofs differ from fraud proofs?", type: "text", difficulty: "master" },
  { prompt: "Explain how blockchain timestamps and block times work", type: "text", difficulty: "novice" },
  { prompt: "What is data availability and why is it important for rollups?", type: "text", difficulty: "expert" },
  { prompt: "How do blockchain nodes synchronize with the network?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the concept of blockchain state and state transitions", type: "text", difficulty: "expert" },
  { prompt: "What are recursive SNARKs and how do they enable proof compression?", type: "text", difficulty: "grandmaster" },
  { prompt: "How does probabilistic finality differ from deterministic finality?", type: "text", difficulty: "master" },
  { prompt: "Explain the Byzantine Generals Problem and how blockchains solve it", type: "text", difficulty: "expert" },
  
  // === SMART CONTRACTS (40 prompts) ===
  { prompt: "What are common smart contract vulnerabilities and how to prevent them?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of upgradeable smart contracts and proxy patterns", type: "text", difficulty: "master" },
  { prompt: "How do oracles work and why are they critical for DeFi?", type: "text", difficulty: "journeyman" },
  { prompt: "What is account abstraction and how does it improve UX?", type: "text", difficulty: "expert" },
  { prompt: "Explain reentrancy attacks and how to prevent them", type: "text", difficulty: "journeyman" },
  { prompt: "What are the differences between CREATE and CREATE2 in Ethereum?", type: "text", difficulty: "expert" },
  { prompt: "How do smart contract events and logs work?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the concept of gas optimization in smart contracts", type: "text", difficulty: "journeyman" },
  { prompt: "What is the EIP-712 standard for typed structured data signing?", type: "text", difficulty: "expert" },
  { prompt: "How do access control patterns work in smart contracts?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the diamond pattern (EIP-2535) for smart contracts", type: "text", difficulty: "master" },
  { prompt: "What are view and pure functions in Solidity?", type: "text", difficulty: "novice" },
  { prompt: "How do smart contract factories work?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the differences between delegatecall and call", type: "text", difficulty: "expert" },
  { prompt: "What is formal verification for smart contracts?", type: "text", difficulty: "master" },
  { prompt: "How do timelock contracts work and why are they used?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain integer overflow and underflow vulnerabilities", type: "text", difficulty: "apprentice" },
  { prompt: "What are the best practices for smart contract testing?", type: "text", difficulty: "journeyman" },
  { prompt: "How do meta-transactions enable gasless transactions?", type: "text", difficulty: "expert" },
  { prompt: "Explain the pull vs push payment pattern in smart contracts", type: "text", difficulty: "journeyman" },
  
  // === CRYPTO ECONOMICS (40 prompts) ===
  { prompt: "Explain tokenomics design principles for sustainable projects", type: "text", difficulty: "expert" },
  { prompt: "How do bonding curves work in token launches?", type: "text", difficulty: "journeyman" },
  { prompt: "What is MEV (Maximal Extractable Value) and its impact on users?", type: "text", difficulty: "master" },
  { prompt: "Compare different staking models: liquid staking vs native staking", type: "text", difficulty: "apprentice" },
  { prompt: "Explain token vesting schedules and their purpose", type: "text", difficulty: "apprentice" },
  { prompt: "How do token burns affect supply and price?", type: "text", difficulty: "novice" },
  { prompt: "What is the difference between inflationary and deflationary tokens?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the concept of token utility and value accrual", type: "text", difficulty: "journeyman" },
  { prompt: "How do airdrops work and what are best practices?", type: "text", difficulty: "novice" },
  { prompt: "What is dilution and how does it affect token holders?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the role of market makers in crypto markets", type: "text", difficulty: "expert" },
  { prompt: "How do governance tokens capture value?", type: "text", difficulty: "journeyman" },
  { prompt: "What is the difference between circulating and total supply?", type: "text", difficulty: "novice" },
  { prompt: "Explain fully diluted valuation (FDV) and its significance", type: "text", difficulty: "apprentice" },
  { prompt: "How do token buybacks affect tokenomics?", type: "text", difficulty: "journeyman" },
  { prompt: "What are economic attacks on blockchain protocols?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of token sinks and their importance", type: "text", difficulty: "journeyman" },
  { prompt: "How does slashing work in Proof of Stake systems?", type: "text", difficulty: "apprentice" },
  { prompt: "What is the role of treasuries in protocol sustainability?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain fair launch vs pre-mine token distributions", type: "text", difficulty: "apprentice" },
  
  // === NFTS & DIGITAL ASSETS (30 prompts) ===
  { prompt: "Explain the technical differences between ERC-721 and ERC-1155 standards", type: "text", difficulty: "journeyman" },
  { prompt: "How do royalty enforcement mechanisms work on different chains?", type: "text", difficulty: "expert" },
  { prompt: "What are soulbound tokens (SBTs) and their potential applications?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain how NFT metadata and IPFS storage work", type: "text", difficulty: "apprentice" },
  { prompt: "What are dynamic NFTs and how do they change over time?", type: "text", difficulty: "journeyman" },
  { prompt: "How do NFT marketplaces handle listings and sales?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the concept of NFT fractionalization", type: "text", difficulty: "journeyman" },
  { prompt: "What are generative art NFTs and how are they created?", type: "text", difficulty: "apprentice" },
  { prompt: "How do music NFTs and royalty splits work?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the differences between on-chain and off-chain NFT data", type: "text", difficulty: "journeyman" },
  { prompt: "What are NFT lending protocols and how do they work?", type: "text", difficulty: "expert" },
  { prompt: "How do compressed NFTs on Solana reduce costs?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the concept of NFT provenance and authenticity", type: "text", difficulty: "apprentice" },
  { prompt: "What are the use cases for NFTs beyond art?", type: "text", difficulty: "novice" },
  { prompt: "How do gaming NFTs and play-to-earn models work?", type: "text", difficulty: "journeyman" },
  
  // === GOVERNANCE & DAOS (30 prompts) ===
  { prompt: "Compare different DAO governance models and their tradeoffs", type: "text", difficulty: "journeyman" },
  { prompt: "What is quadratic voting and how does it prevent plutocracy?", type: "text", difficulty: "expert" },
  { prompt: "Explain conviction voting and its advantages for DAOs", type: "text", difficulty: "master" },
  { prompt: "How do governance tokens distribute voting power?", type: "text", difficulty: "apprentice" },
  { prompt: "What is rage quit in DAOs and how does it work?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the role of delegates in DAO governance", type: "text", difficulty: "journeyman" },
  { prompt: "How do governance proposals and voting periods work?", type: "text", difficulty: "novice" },
  { prompt: "What is governance minimization and why does it matter?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of optimistic governance", type: "text", difficulty: "master" },
  { prompt: "How do multi-sig treasuries work for DAOs?", type: "text", difficulty: "journeyman" },
  { prompt: "What are the challenges of on-chain vs off-chain voting?", type: "text", difficulty: "expert" },
  { prompt: "Explain how Snapshot voting works for gas-free governance", type: "text", difficulty: "apprentice" },
  { prompt: "What is futarchy and how could it improve governance?", type: "text", difficulty: "grandmaster" },
  { prompt: "How do DAOs handle contributor compensation?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the legal considerations for DAOs", type: "text", difficulty: "expert" },
  
  // === SECURITY (40 prompts) ===
  { prompt: "Describe common attack vectors in DeFi protocols", type: "text", difficulty: "expert" },
  { prompt: "How do multi-signature wallets enhance security?", type: "text", difficulty: "novice" },
  { prompt: "Explain the importance of formal verification in smart contracts", type: "text", difficulty: "master" },
  { prompt: "What are sandwich attacks and how can users protect themselves?", type: "text", difficulty: "journeyman" },
  { prompt: "How do oracle manipulation attacks work?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of economic security in DeFi", type: "text", difficulty: "master" },
  { prompt: "What are the best practices for crypto wallet security?", type: "text", difficulty: "novice" },
  { prompt: "How do hardware wallets protect private keys?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain social engineering attacks in crypto", type: "text", difficulty: "apprentice" },
  { prompt: "What is a 51% attack and which chains are vulnerable?", type: "text", difficulty: "journeyman" },
  { prompt: "How do bug bounty programs improve protocol security?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain the role of audits in smart contract security", type: "text", difficulty: "journeyman" },
  { prompt: "What are front-running bots and how do they work?", type: "text", difficulty: "expert" },
  { prompt: "How do time-bandit attacks threaten blockchain security?", type: "text", difficulty: "master" },
  { prompt: "Explain the security model of bridges and cross-chain protocols", type: "text", difficulty: "expert" },
  { prompt: "What is a governance attack and how can DAOs prevent them?", type: "text", difficulty: "expert" },
  { prompt: "How do price oracle attacks lead to protocol exploits?", type: "text", difficulty: "master" },
  { prompt: "Explain the concept of circuit breakers in DeFi", type: "text", difficulty: "journeyman" },
  { prompt: "What are the risks of token approvals and how to manage them?", type: "text", difficulty: "apprentice" },
  { prompt: "How do phishing attacks target crypto users?", type: "text", difficulty: "novice" },
  
  // === AI & BLOCKCHAIN (30 prompts) ===
  { prompt: "How can blockchain enable decentralized AI model training?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of federated learning on blockchain", type: "text", difficulty: "master" },
  { prompt: "What are AI agents and how do they interact with blockchains?", type: "text", difficulty: "journeyman" },
  { prompt: "How do compute networks like Akash or Render work?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the concept of proof of useful work for AI training", type: "text", difficulty: "expert" },
  { prompt: "What is decentralized inference and why does it matter?", type: "text", difficulty: "journeyman" },
  { prompt: "How can blockchain verify AI model outputs?", type: "text", difficulty: "master" },
  { prompt: "Explain the role of tokenomics in AI compute networks", type: "text", difficulty: "expert" },
  { prompt: "What are the challenges of running AI on decentralized networks?", type: "text", difficulty: "journeyman" },
  { prompt: "How do AI-powered trading bots work in crypto?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain how LLMs can interact with smart contracts", type: "text", difficulty: "expert" },
  { prompt: "What is on-chain machine learning and its limitations?", type: "text", difficulty: "master" },
  { prompt: "How can blockchain solve AI data provenance problems?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the concept of AI model marketplaces on blockchain", type: "text", difficulty: "journeyman" },
  { prompt: "What are zero-knowledge proofs for AI inference?", type: "text", difficulty: "grandmaster" },
  
  // === LAYER 2s & SCALING (30 prompts) ===
  { prompt: "Compare Arbitrum, Optimism, and Base as Layer 2 solutions", type: "text", difficulty: "journeyman" },
  { prompt: "How do sequencers work in rollup architectures?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of escape hatches in Layer 2s", type: "text", difficulty: "master" },
  { prompt: "What is EIP-4844 (Proto-Danksharding) and how does it reduce L2 costs?", type: "text", difficulty: "expert" },
  { prompt: "How do fraud proofs work in optimistic rollups?", type: "text", difficulty: "expert" },
  { prompt: "Explain the difference between validiums and volitions", type: "text", difficulty: "master" },
  { prompt: "What is the Superchain and how does it connect L2s?", type: "text", difficulty: "journeyman" },
  { prompt: "How do app-specific rollups (app-chains) work?", type: "text", difficulty: "expert" },
  { prompt: "Explain the role of data availability layers like Celestia", type: "text", difficulty: "master" },
  { prompt: "What are based rollups and how do they differ from standard rollups?", type: "text", difficulty: "grandmaster" },
  { prompt: "How does cross-L2 communication work?", type: "text", difficulty: "expert" },
  { prompt: "Explain the security tradeoffs of different L2 designs", type: "text", difficulty: "master" },
  { prompt: "What is recursive proof aggregation in zk-rollups?", type: "text", difficulty: "grandmaster" },
  { prompt: "How do L2 bridges interact with L1 security?", type: "text", difficulty: "expert" },
  { prompt: "Explain the concept of L3s and hyperchains", type: "text", difficulty: "master" },

  // === WALLETS & USER EXPERIENCE (20 prompts) ===
  { prompt: "What is a seed phrase and how should it be stored?", type: "text", difficulty: "novice" },
  { prompt: "Explain the difference between custodial and non-custodial wallets", type: "text", difficulty: "novice" },
  { prompt: "How do hardware wallets differ from software wallets?", type: "text", difficulty: "apprentice" },
  { prompt: "What is wallet connect and how does it work?", type: "text", difficulty: "apprentice" },
  { prompt: "Explain how browser extension wallets like MetaMask work", type: "text", difficulty: "apprentice" },
  { prompt: "What is a smart contract wallet and its advantages?", type: "text", difficulty: "journeyman" },
  { prompt: "How do social recovery wallets work?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the concept of session keys for better UX", type: "text", difficulty: "expert" },
  { prompt: "What are passkeys and how can they improve crypto UX?", type: "text", difficulty: "journeyman" },
  { prompt: "How do embedded wallets in dApps work?", type: "text", difficulty: "journeyman" },
  
  // === TRADING & MARKETS (20 prompts) ===
  { prompt: "What is the difference between spot and derivatives trading?", type: "text", difficulty: "novice" },
  { prompt: "Explain order types: market, limit, and stop orders", type: "text", difficulty: "novice" },
  { prompt: "How does leverage trading work in crypto?", type: "text", difficulty: "apprentice" },
  { prompt: "What is dollar cost averaging (DCA) as an investment strategy?", type: "text", difficulty: "novice" },
  { prompt: "Explain the concept of liquidity in crypto markets", type: "text", difficulty: "apprentice" },
  { prompt: "How do CEXs differ from DEXs in terms of trading?", type: "text", difficulty: "apprentice" },
  { prompt: "What is price impact and how is it calculated?", type: "text", difficulty: "journeyman" },
  { prompt: "Explain the role of market depth in trading", type: "text", difficulty: "journeyman" },
  { prompt: "How do trading bots and algorithms work in crypto?", type: "text", difficulty: "expert" },
  { prompt: "What is arbitrage and how do traders profit from it?", type: "text", difficulty: "journeyman" }
];

const DIFFICULTY_CONFIG = {
  novice: { rewardMultiplier: 1.0, xpMultiplier: 1.0 },
  apprentice: { rewardMultiplier: 1.25, xpMultiplier: 1.2 },
  journeyman: { rewardMultiplier: 1.5, xpMultiplier: 1.5 },
  expert: { rewardMultiplier: 2.0, xpMultiplier: 2.0 },
  master: { rewardMultiplier: 3.0, xpMultiplier: 2.5 },
  grandmaster: { rewardMultiplier: 5.0, xpMultiplier: 3.0 }
};

async function generateTask() {
  const item = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const config = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG.novice;
  
  const task = new Task({
    prompt: item.prompt,
    type: item.type,
    requester: 'system',
    params: { maxTokens: 300 },
    status: 'pending',
    priority: Math.floor(Math.random() * 3) + 1,
    difficulty: item.difficulty,
    difficultyName: item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1),
    rewardMultiplier: config.rewardMultiplier,
    xpMultiplier: config.xpMultiplier
  });
  
  await task.save();
  return task;
}

async function ensureMinTasks(minCount = 100) {
  const pendingCount = await Task.countDocuments({ status: 'pending' });
  
  if (pendingCount < minCount) {
    const toCreate = Math.min(minCount - pendingCount, 50);
    console.log('[TaskGen] Creating', toCreate, 'tasks');
    for (let i = 0; i < toCreate; i++) {
      await generateTask();
    }
  }
}

// Bulk create tasks
async function createBulkTasks(count = 2000) {
  console.log('[TaskGen] Creating', count, 'tasks in bulk...');
  const batchSize = 100;
  let created = 0;
  
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < count; j++) {
      const item = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
      const config = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG.novice;
      batch.push({
        prompt: item.prompt,
        type: item.type,
        requester: 'system',
        params: { maxTokens: 300 },
        status: 'pending',
        priority: Math.floor(Math.random() * 3) + 1,
        difficulty: item.difficulty,
        difficultyName: item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1),
        rewardMultiplier: config.rewardMultiplier,
        xpMultiplier: config.xpMultiplier
      });
    }
    await Task.insertMany(batch);
    created += batch.length;
    console.log('[TaskGen] Created', created, '/', count);
  }
  
  console.log('[TaskGen] Bulk creation complete:', created, 'tasks');
  return created;
}

module.exports = { generateTask, ensureMinTasks, createBulkTasks, PROMPTS };
