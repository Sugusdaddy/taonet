const express = require('express');
const router = express.Router();
const InferenceProof = require('../models/InferenceProof');
const Anchor = require('../models/Anchor');
const solanaAnchor = require('../services/solanaAnchor');
const crypto = require('crypto');

// Get all proofs with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [proofs, total] = await Promise.all([
      InferenceProof.find()
        .sort({ blockNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InferenceProof.countDocuments()
    ]);

    // Get latest anchor
    const latestAnchor = await Anchor.findOne().sort({ toBlock: -1 });

    res.json({
      proofs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      chain: {
        latestBlock: proofs[0]?.blockNumber || 0,
        latestHash: proofs[0]?.blockHash || null,
        latestAnchor: latestAnchor ? {
          toBlock: latestAnchor.toBlock,
          solanaTx: latestAnchor.solanaTxSignature,
          solanaUrl: `https://solscan.io/tx/${latestAnchor.solanaTxSignature}?cluster=devnet`
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chain stats
router.get('/stats', async (req, res) => {
  try {
    const [totalProofs, latestProof, totalAnchors, latestAnchor] = await Promise.all([
      InferenceProof.countDocuments(),
      InferenceProof.findOne().sort({ blockNumber: -1 }),
      Anchor.countDocuments(),
      Anchor.findOne().sort({ toBlock: -1 })
    ]);

    // Calculate total tokens generated
    const tokenStats = await InferenceProof.aggregate([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokensGenerated' },
          avgProcessingTime: { $avg: '$processingTimeMs' }
        }
      }
    ]);

    res.json({
      height: latestProof?.blockNumber || 0,
      totalProofs,
      latestHash: latestProof?.blockHash || null,
      totalTokens: tokenStats[0]?.totalTokens || 0,
      avgProcessingTime: Math.round(tokenStats[0]?.avgProcessingTime || 0),
      anchors: {
        total: totalAnchors,
        latestAnchoredBlock: latestAnchor?.toBlock || 0,
        unanchoredBlocks: (latestProof?.blockNumber || 0) - (latestAnchor?.toBlock || 0),
        latestSolanaTx: latestAnchor?.solanaTxSignature || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single proof by ID or block number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let proof;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      proof = await InferenceProof.findById(id);
    } else {
      proof = await InferenceProof.findOne({ blockNumber: parseInt(id) });
    }

    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    // Check if anchored
    const anchor = await Anchor.findOne({
      fromBlock: { $lte: proof.blockNumber },
      toBlock: { $gte: proof.blockNumber }
    });

    res.json({
      proof,
      anchored: !!anchor,
      anchor: anchor ? {
        merkleRoot: anchor.merkleRoot,
        solanaTx: anchor.solanaTxSignature,
        solanaUrl: `https://solscan.io/tx/${anchor.solanaTxSignature}?cluster=devnet`
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify a proof - check hash and anchor status
router.post('/verify', async (req, res) => {
  try {
    const { proofId, prompt, response, miner } = req.body;

    // If proofId provided, verify existing proof
    if (proofId) {
      const result = await solanaAnchor.verifyProof(proofId);
      return res.json(result);
    }

    // If raw data provided, verify hash matches
    if (prompt && response) {
      // Find proof by recalculating hash
      const dataToHash = JSON.stringify({
        prompt,
        response,
        miner: miner?.toLowerCase()
      });
      const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      const proof = await InferenceProof.findOne({ 
        $or: [
          { blockHash: computedHash },
          { inputHash: crypto.createHash('sha256').update(prompt).digest('hex') }
        ]
      });

      if (!proof) {
        return res.json({
          verified: false,
          error: 'No matching proof found',
          computedHash
        });
      }

      // Check anchor status
      const anchor = await Anchor.findOne({
        fromBlock: { $lte: proof.blockNumber },
        toBlock: { $gte: proof.blockNumber }
      });

      return res.json({
        verified: true,
        hashMatch: proof.blockHash === computedHash,
        proof: {
          blockNumber: proof.blockNumber,
          blockHash: proof.blockHash,
          miner: proof.miner,
          timestamp: proof.timestamp
        },
        anchored: !!anchor,
        anchor: anchor ? {
          merkleRoot: anchor.merkleRoot,
          solanaTx: anchor.solanaTxSignature,
          solanaUrl: `https://solscan.io/tx/${anchor.solanaTxSignature}?cluster=devnet`
        } : null
      });
    }

    res.status(400).json({ error: 'Provide proofId or prompt+response' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all anchors
router.get('/anchors/list', async (req, res) => {
  try {
    const anchors = await Anchor.find()
      .sort({ toBlock: -1 })
      .limit(20)
      .select('-leaves'); // Don't send all leaves

    res.json({ anchors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get merkle proof for a specific proof
router.get('/:id/merkle-proof', async (req, res) => {
  try {
    const proof = await InferenceProof.findById(req.params.id);
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    const anchor = await Anchor.findOne({
      fromBlock: { $lte: proof.blockNumber },
      toBlock: { $gte: proof.blockNumber }
    });

    if (!anchor) {
      return res.json({
        anchored: false,
        message: 'Proof not yet anchored to Solana'
      });
    }

    const leafIndex = anchor.leaves.indexOf(proof.blockHash);
    const merkleProof = solanaAnchor.getMerkleProof(anchor.leaves, leafIndex);

    res.json({
      anchored: true,
      proof: {
        blockNumber: proof.blockNumber,
        blockHash: proof.blockHash
      },
      merkleRoot: anchor.merkleRoot,
      merkleProof,
      solanaTx: anchor.solanaTxSignature,
      solanaUrl: `https://solscan.io/tx/${anchor.solanaTxSignature}?cluster=devnet`,
      verificationSteps: [
        '1. Get the proof blockHash',
        '2. Apply merkle proof steps (hash with siblings)',
        '3. Compare result with merkleRoot',
        '4. Verify merkleRoot exists in Solana tx memo'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
