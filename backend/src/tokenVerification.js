/**
 * Token Verification System
 * Verifies token holdings on Solana for staking tiers
 */

const TOKEN_MINT = process.env.TOKEN_MINT || null; // Set after token launch
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Staking tier thresholds (in token units with decimals)
const TIER_THRESHOLDS = {
  bronze: BigInt(0),
  silver: BigInt(10000) * BigInt(1e9),      // 10K tokens (assuming 9 decimals)
  gold: BigInt(100000) * BigInt(1e9),       // 100K tokens
  platinum: BigInt(1000000) * BigInt(1e9),  // 1M tokens
  diamond: BigInt(10000000) * BigInt(1e9)   // 10M tokens
};

// Verify token balance for a wallet
async function verifyTokenBalance(walletAddress) {
  if (!TOKEN_MINT) {
    // Demo mode - return mock balance
    console.log('Token verification in demo mode');
    return {
      verified: true,
      balance: '0',
      tier: 'bronze',
      demo: true
    };
  }
  
  try {
    // Fetch token accounts for wallet
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: TOKEN_MINT },
          { encoding: 'jsonParsed' }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Solana RPC error:', data.error);
      return { verified: false, error: data.error.message };
    }
    
    // Calculate total balance across all token accounts
    let totalBalance = BigInt(0);
    
    if (data.result?.value) {
      for (const account of data.result.value) {
        const tokenAmount = account.account.data.parsed.info.tokenAmount;
        totalBalance += BigInt(tokenAmount.amount);
      }
    }
    
    // Determine tier
    const tier = calculateTier(totalBalance);
    
    return {
      verified: true,
      balance: totalBalance.toString(),
      balanceFormatted: formatBalance(totalBalance),
      tier,
      tierMultiplier: getTierMultiplier(tier)
    };
    
  } catch (error) {
    console.error('Token verification error:', error);
    return { verified: false, error: error.message };
  }
}

// Calculate tier from balance
function calculateTier(balance) {
  if (balance >= TIER_THRESHOLDS.diamond) return 'diamond';
  if (balance >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (balance >= TIER_THRESHOLDS.gold) return 'gold';
  if (balance >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

// Get tier multiplier
function getTierMultiplier(tier) {
  const multipliers = {
    bronze: 1.0,
    silver: 1.25,
    gold: 1.5,
    platinum: 2.0,
    diamond: 3.0
  };
  return multipliers[tier] || 1.0;
}

// Format balance for display
function formatBalance(balance, decimals = 9) {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  
  if (whole >= BigInt(1000000)) {
    return `${(Number(whole) / 1000000).toFixed(2)}M`;
  } else if (whole >= BigInt(1000)) {
    return `${(Number(whole) / 1000).toFixed(2)}K`;
  } else {
    return whole.toString();
  }
}

// Batch verify multiple wallets
async function batchVerifyBalances(walletAddresses) {
  const results = new Map();
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < walletAddresses.length; i += batchSize) {
    const batch = walletAddresses.slice(i, i + batchSize);
    
    const promises = batch.map(async (address) => {
      const result = await verifyTokenBalance(address);
      results.set(address, result);
    });
    
    await Promise.all(promises);
    
    // Small delay between batches
    if (i + batchSize < walletAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Update miner tiers based on verified balances
async function updateMinerTiers(Miner) {
  try {
    if (!TOKEN_MINT) {
      console.log('Skipping tier update - no token configured');
      return { updated: 0 };
    }
    
    const miners = await Miner.find({ isActive: true }).select('address stakingTier');
    const addresses = miners.map(m => m.address);
    
    const verifications = await batchVerifyBalances(addresses);
    
    let updated = 0;
    for (const miner of miners) {
      const verification = verifications.get(miner.address);
      
      if (verification?.verified && verification.tier !== miner.stakingTier) {
        const oldTier = miner.stakingTier;
        miner.stakingTier = verification.tier;
        miner.tokenBalance = verification.balance;
        await miner.save();
        
        updated++;
        console.log(`Tier updated: ${miner.address} ${oldTier} -> ${verification.tier}`);
        
        // Send notification if tier upgraded
        if (getTierMultiplier(verification.tier) > getTierMultiplier(oldTier)) {
          // Trigger notification
        }
      }
    }
    
    return { updated, total: miners.length };
  } catch (error) {
    console.error('Update miner tiers error:', error);
    return { error: error.message };
  }
}

// Verify wallet signature (for authentication)
async function verifySignature(message, signature, publicKey) {
  try {
    // In production, use @solana/web3.js
    // const { PublicKey } = require('@solana/web3.js');
    // const nacl = require('tweetnacl');
    // 
    // const messageBytes = new TextEncoder().encode(message);
    // const signatureBytes = Buffer.from(signature, 'base64');
    // const publicKeyBytes = new PublicKey(publicKey).toBytes();
    // 
    // return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    
    // Demo mode - accept all
    if (!TOKEN_MINT) {
      return true;
    }
    
    // TODO: Implement real signature verification
    return signature.startsWith('sig_') || signature.length > 50;
    
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Express router for token verification endpoints
const express = require('express');
const router = express.Router();

// Verify single wallet
router.get('/verify/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await verifyTokenBalance(address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get tier info
router.get('/tiers', (req, res) => {
  res.json({
    thresholds: {
      bronze: '0',
      silver: TIER_THRESHOLDS.silver.toString(),
      gold: TIER_THRESHOLDS.gold.toString(),
      platinum: TIER_THRESHOLDS.platinum.toString(),
      diamond: TIER_THRESHOLDS.diamond.toString()
    },
    multipliers: {
      bronze: 1.0,
      silver: 1.25,
      gold: 1.5,
      platinum: 2.0,
      diamond: 3.0
    },
    tokenMint: TOKEN_MINT || 'Not configured (demo mode)'
  });
});

// Manual tier refresh (admin)
router.post('/refresh-tiers', async (req, res) => {
  const Miner = require('./models/Miner');
  const result = await updateMinerTiers(Miner);
  res.json(result);
});

module.exports = {
  verifyTokenBalance,
  calculateTier,
  getTierMultiplier,
  batchVerifyBalances,
  updateMinerTiers,
  verifySignature,
  router,
  TIER_THRESHOLDS
};
