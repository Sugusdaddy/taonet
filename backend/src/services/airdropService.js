/**
 * TaoNet Airdrop Service
 * Handles SPL token transfers to miners (Token-2022 compatible)
 */

const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const Airdrop = require('../models/Airdrop');

// Daily limit: 25,000 tokens (stored in token decimals = 25000 * 1e9)
const DAILY_LIMIT_TOKENS = BigInt(25000) * BigInt(1e9);

// Token-2022 program ID (pump.fun uses this)
const TOKEN_2022_PROGRAM_ID = splToken.TOKEN_2022_PROGRAM_ID;

// Simple base58 decoder
function decodeBase58(str) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let carry = ALPHABET.indexOf(str[i]);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

class AirdropService {
  constructor() {
    this.connection = null;
    this.wallet = null;
    this.tokenMint = null;
    this.sourceTokenAccount = null;
    this.initialized = false;
    this.processing = false;
  }
  
  async initialize() {
    try {
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      this.connection = new Connection(rpcUrl, 'confirmed');
      
      if (!process.env.SOLANA_PRIVATE_KEY) {
        console.log('[Airdrop] No wallet configured - airdrops disabled');
        return false;
      }
      
      if (!process.env.TOKEN_MINT) {
        console.log('[Airdrop] No token mint configured - airdrops disabled');
        return false;
      }
      
      try {
        const privateKeyBytes = decodeBase58(process.env.SOLANA_PRIVATE_KEY);
        this.wallet = Keypair.fromSecretKey(privateKeyBytes);
      } catch (keyErr) {
        console.error('[Airdrop] Failed to parse private key:', keyErr.message);
        return false;
      }
      
      this.tokenMint = new PublicKey(process.env.TOKEN_MINT);
      
      // Find existing token account for this wallet (pump.fun creates non-ATA accounts)
      try {
        const accounts = await this.connection.getTokenAccountsByOwner(
          this.wallet.publicKey, 
          { mint: this.tokenMint }
        );
        
        if (accounts.value.length > 0) {
          this.sourceTokenAccount = accounts.value[0].pubkey;
          const balance = await this.connection.getTokenAccountBalance(this.sourceTokenAccount);
          console.log(`[Airdrop] Found token account: ${this.sourceTokenAccount.toBase58()}`);
          console.log(`[Airdrop] Token balance: ${balance.value.uiAmount}`);
        } else {
          console.error('[Airdrop] No token account found for this wallet');
          return false;
        }
      } catch (err) {
        console.error('[Airdrop] Error finding token account:', err.message);
        return false;
      }
      
      this.initialized = true;
      console.log(`[Airdrop] Initialized with wallet: ${this.wallet.publicKey.toBase58()}`);
      console.log(`[Airdrop] Token mint: ${this.tokenMint.toBase58()}`);
      console.log(`[Airdrop] Source account: ${this.sourceTokenAccount.toBase58()}`);
      console.log(`[Airdrop] Using Token-2022 program`);
      console.log(`[Airdrop] Daily limit: 25,000 tokens`);
      
      this.startProcessing();
      
      return true;
    } catch (error) {
      console.error('[Airdrop] Init error:', error.message);
      return false;
    }
  }
  
  async getTodayDistributed() {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const completedToday = await Airdrop.find({
      status: 'completed',
      completedAt: { $gte: startOfDay }
    }, { amount: 1 }).lean();
    
    let total = BigInt(0);
    for (const a of completedToday) {
      try {
        const amountInTokens = BigInt(a.amount) / BigInt(1e9);
        total += amountInTokens;
      } catch {}
    }
    return total;
  }
  
  async canDistribute(amountWei) {
    const todayDistributed = await this.getTodayDistributed();
    const amountInTokens = BigInt(amountWei) / BigInt(1e9);
    const newTotal = todayDistributed + amountInTokens;
    return newTotal <= DAILY_LIMIT_TOKENS;
  }
  
  async queueAirdrop(recipient, amount, reason, metadata = {}) {
    try {
      const canSend = await this.canDistribute(amount);
      if (!canSend) {
        console.log(`[Airdrop] Daily limit reached (25k tokens). Skipping airdrop to ${recipient.slice(0,8)}...`);
        return null;
      }
      
      const airdrop = new Airdrop({
        recipient,
        amount: amount.toString(),
        reason,
        taskId: metadata.taskId,
        proofId: metadata.proofId,
        rewardId: metadata.rewardId,
        status: 'pending'
      });
      await airdrop.save();
      console.log(`[Airdrop] Queued: ${(BigInt(amount) / BigInt(1e9)).toString()} tokens to ${recipient.slice(0,8)}... (${reason})`);
      return airdrop;
    } catch (error) {
      console.error('[Airdrop] Queue error:', error.message);
      return null;
    }
  }
  
  async processPending() {
    if (!this.initialized || this.processing) {
      return { processed: 0, skipped: 'not_ready' };
    }
    
    this.processing = true;
    let processed = 0;
    let failed = 0;
    let skippedLimit = 0;
    
    try {
      const pending = await Airdrop.find({ 
        status: 'pending',
        retries: { $lt: 3 }
      }).sort({ createdAt: 1 }).limit(10);
      
      for (const airdrop of pending) {
        try {
          const canSend = await this.canDistribute(airdrop.amount);
          if (!canSend) {
            console.log(`[Airdrop] Daily limit reached. Pausing until tomorrow.`);
            skippedLimit++;
            continue;
          }
          
          airdrop.status = 'processing';
          airdrop.processedAt = new Date();
          await airdrop.save();
          
          const txSig = await this.sendTokens(airdrop.recipient, BigInt(airdrop.amount));
          
          if (txSig) {
            airdrop.txSignature = txSig;
            airdrop.status = 'completed';
            airdrop.completedAt = new Date();
            processed++;
            console.log(`[Airdrop] Completed: ${txSig.slice(0,20)}...`);
          } else {
            throw new Error('No transaction signature');
          }
          
          await airdrop.save();
          
        } catch (err) {
          airdrop.status = 'pending';
          airdrop.retries = (airdrop.retries || 0) + 1;
          airdrop.error = err.message || err.toString();
          await airdrop.save();
          failed++;
          console.error(`[Airdrop] Failed: ${airdrop._id} - ${err.message || err}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
    } catch (error) {
      console.error('[Airdrop] Process error:', error.message);
    }
    
    this.processing = false;
    if (processed > 0 || failed > 0 || skippedLimit > 0) {
      console.log(`[Airdrop] Batch: processed=${processed}, failed=${failed}, skipped=${skippedLimit}`);
    }
    return { processed, failed, skippedLimit };
  }
  
  async sendTokens(recipientAddress, amountWei) {
    const recipient = new PublicKey(recipientAddress);
    
    // Get recipient's ATA for Token-2022
    const recipientATA = splToken.getAssociatedTokenAddressSync(
      this.tokenMint, 
      recipient, 
      false, 
      TOKEN_2022_PROGRAM_ID
    );
    
    // Convert from 1e18 to token decimals (1e9)
    const transferAmount = amountWei / BigInt(1e9);
    
    const tx = new Transaction();
    
    // Check if ATA exists
    const ataInfo = await this.connection.getAccountInfo(recipientATA);
    
    if (!ataInfo) {
      // Create ATA if it doesn't exist
      const createATAIx = splToken.createAssociatedTokenAccountInstruction(
        this.wallet.publicKey,
        recipientATA,
        recipient,
        this.tokenMint,
        TOKEN_2022_PROGRAM_ID
      );
      tx.add(createATAIx);
    }
    
    // Add transfer instruction
    const transferIx = splToken.createTransferInstruction(
      this.sourceTokenAccount,
      recipientATA,
      this.wallet.publicKey,
      transferAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    tx.add(transferIx);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.wallet],
      { commitment: 'confirmed' }
    );
    
    console.log(`[Airdrop] Sent ${transferAmount} tokens to ${recipientAddress.slice(0,8)}... TX: ${signature.slice(0,30)}...`);
    
    return signature;
  }
  
  startProcessing() {
    setInterval(() => {
      this.processPending().catch(console.error);
    }, 30000);
    
    setTimeout(() => {
      this.processPending().catch(console.error);
    }, 5000);
  }
  
  async getStats() {
    const [pending, completed, failed] = await Promise.all([
      Airdrop.countDocuments({ status: 'pending' }),
      Airdrop.countDocuments({ status: 'completed' }),
      Airdrop.countDocuments({ status: 'failed' })
    ]);
    
    const completedAirdrops = await Airdrop.find({ status: 'completed' }, { amount: 1 }).lean();
    let totalDistributed = BigInt(0);
    for (const a of completedAirdrops) {
      try { totalDistributed += BigInt(a.amount) / BigInt(1e9); } catch {}
    }
    
    const todayDistributed = await this.getTodayDistributed();
    const dailyLimitTokens = DAILY_LIMIT_TOKENS / BigInt(1e9);
    const remainingToday = dailyLimitTokens - (todayDistributed / BigInt(1e9));
    
    return {
      pending,
      completed,
      failed,
      totalDistributed: totalDistributed.toString(),
      todayDistributed: (todayDistributed / BigInt(1e9)).toString(),
      dailyLimit: dailyLimitTokens.toString(),
      remainingToday: remainingToday > 0 ? remainingToday.toString() : '0',
      tokenMint: this.tokenMint?.toBase58(),
      wallet: this.wallet?.publicKey?.toBase58(),
      sourceAccount: this.sourceTokenAccount?.toBase58(),
      initialized: this.initialized
    };
  }
  
  async getRecent(limit = 20) {
    return Airdrop.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();
  }
}

const airdropService = new AirdropService();
module.exports = airdropService;
