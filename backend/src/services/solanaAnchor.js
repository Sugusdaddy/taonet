const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } = require('@solana/web3.js');
const crypto = require('crypto');
const InferenceProof = require('../models/InferenceProof');

// Solana Memo Program - allows writing arbitrary data to blockchain
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

class SolanaAnchor {
  constructor() {
    // Use devnet for testing, mainnet for production
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.keypair = null;
    this.anchorInterval = parseInt(process.env.ANCHOR_INTERVAL) || 10; // Anchor every 10 blocks
  }

  // Initialize with private key
  init(privateKeyBase58) {
    if (privateKeyBase58) {
      const bs58 = require('bs58');
      this.keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
      console.log(`[Anchor] Initialized with wallet: ${this.keypair.publicKey.toBase58()}`);
    } else {
      console.log('[Anchor] No private key provided - anchor disabled');
    }
  }

  // Build merkle tree from proofs
  buildMerkleTree(proofs) {
    if (proofs.length === 0) return { root: null, leaves: [] };

    // Create leaves from proof hashes
    const leaves = proofs.map(p => p.blockHash);

    // Build tree bottom-up
    let level = leaves.map(h => h);
    
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left; // Duplicate last if odd
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      level = nextLevel;
    }

    return {
      root: level[0],
      leaves,
      proofCount: proofs.length
    };
  }

  // Get merkle proof for a specific leaf
  getMerkleProof(leaves, index) {
    if (index >= leaves.length) return null;

    const proof = [];
    let level = [...leaves];
    let idx = index;

    while (level.length > 1) {
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      
      if (siblingIdx < level.length) {
        proof.push({
          hash: level[siblingIdx],
          position: isRight ? 'left' : 'right'
        });
      }

      // Build next level
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      level = nextLevel;
      idx = Math.floor(idx / 2);
    }

    return proof;
  }

  // Verify a leaf against merkle root
  verifyMerkleProof(leafHash, proof, root) {
    let currentHash = leafHash;

    for (const step of proof) {
      const left = step.position === 'left' ? step.hash : currentHash;
      const right = step.position === 'right' ? step.hash : currentHash;
      currentHash = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
    }

    return currentHash === root;
  }

  // Anchor merkle root to Solana
  async anchorToSolana(merkleRoot, fromBlock, toBlock, proofCount) {
    if (!this.keypair) {
      console.log('[Anchor] No keypair - skipping anchor');
      return null;
    }

    try {
      // Create memo with anchor data
      const anchorData = JSON.stringify({
        type: 'TAONET_ANCHOR',
        version: 1,
        merkleRoot,
        fromBlock,
        toBlock,
        proofCount,
        timestamp: Date.now()
      });

      // Create memo instruction
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(anchorData, 'utf-8')
      });

      // Create and send transaction
      const transaction = new Transaction().add(memoInstruction);
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
        { commitment: 'confirmed' }
      );

      console.log(`[Anchor] Anchored blocks ${fromBlock}-${toBlock} to Solana: ${signature}`);

      return {
        signature,
        merkleRoot,
        fromBlock,
        toBlock,
        proofCount,
        solanaUrl: `https://solscan.io/tx/${signature}?cluster=devnet`
      };
    } catch (error) {
      console.error('[Anchor] Failed to anchor:', error.message);
      return null;
    }
  }

  // Check if we need to anchor and do it
  async checkAndAnchor() {
    try {
      // Get last anchor
      const Anchor = require('../models/Anchor');
      const lastAnchor = await Anchor.findOne().sort({ toBlock: -1 });
      const lastAnchoredBlock = lastAnchor?.toBlock || 0;

      // Get current block height
      const latestProof = await InferenceProof.findOne().sort({ blockNumber: -1 });
      const currentBlock = latestProof?.blockNumber || 0;

      // Check if we have enough new blocks
      const newBlocks = currentBlock - lastAnchoredBlock;
      if (newBlocks < this.anchorInterval) {
        return null; // Not enough blocks yet
      }

      // Get proofs to anchor
      const proofsToAnchor = await InferenceProof.find({
        blockNumber: { $gt: lastAnchoredBlock, $lte: currentBlock }
      }).sort({ blockNumber: 1 });

      if (proofsToAnchor.length === 0) return null;

      // Build merkle tree
      const { root, leaves } = this.buildMerkleTree(proofsToAnchor);

      // Anchor to Solana
      const result = await this.anchorToSolana(
        root,
        lastAnchoredBlock + 1,
        currentBlock,
        proofsToAnchor.length
      );

      if (result) {
        // Save anchor record
        const anchor = new Anchor({
          merkleRoot: root,
          fromBlock: lastAnchoredBlock + 1,
          toBlock: currentBlock,
          proofCount: proofsToAnchor.length,
          solanaTxSignature: result.signature,
          leaves
        });
        await anchor.save();
      }

      return result;
    } catch (error) {
      console.error('[Anchor] Check failed:', error.message);
      return null;
    }
  }

  // Verify a proof is anchored on Solana
  async verifyProof(proofId) {
    try {
      const proof = await InferenceProof.findById(proofId);
      if (!proof) return { verified: false, error: 'Proof not found' };

      // Find anchor containing this proof
      const Anchor = require('../models/Anchor');
      const anchor = await Anchor.findOne({
        fromBlock: { $lte: proof.blockNumber },
        toBlock: { $gte: proof.blockNumber }
      });

      if (!anchor) {
        return { 
          verified: false, 
          error: 'Not yet anchored to Solana',
          proof: {
            blockNumber: proof.blockNumber,
            blockHash: proof.blockHash
          }
        };
      }

      // Find leaf index
      const leafIndex = anchor.leaves.indexOf(proof.blockHash);
      if (leafIndex === -1) {
        return { verified: false, error: 'Proof not in anchor' };
      }

      // Get merkle proof
      const merkleProof = this.getMerkleProof(anchor.leaves, leafIndex);

      // Verify
      const isValid = this.verifyMerkleProof(proof.blockHash, merkleProof, anchor.merkleRoot);

      return {
        verified: isValid,
        proof: {
          blockNumber: proof.blockNumber,
          blockHash: proof.blockHash,
          miner: proof.miner,
          timestamp: proof.timestamp
        },
        anchor: {
          merkleRoot: anchor.merkleRoot,
          solanaTx: anchor.solanaTxSignature,
          solanaUrl: `https://solscan.io/tx/${anchor.solanaTxSignature}?cluster=devnet`,
          anchoredAt: anchor.createdAt
        },
        merkleProof
      };
    } catch (error) {
      return { verified: false, error: error.message };
    }
  }
}

module.exports = new SolanaAnchor();
