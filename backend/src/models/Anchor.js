const mongoose = require('mongoose');

const AnchorSchema = new mongoose.Schema({
  // Merkle root of all proofs in this anchor
  merkleRoot: {
    type: String,
    required: true,
    index: true
  },
  
  // Block range covered
  fromBlock: {
    type: Number,
    required: true
  },
  toBlock: {
    type: Number,
    required: true,
    index: true
  },
  
  // Number of proofs included
  proofCount: {
    type: Number,
    required: true
  },
  
  // Solana transaction signature
  solanaTxSignature: {
    type: String,
    required: true,
    unique: true
  },
  
  // All leaf hashes for merkle proof verification
  leaves: [{
    type: String
  }],
  
  // Network (devnet/mainnet)
  network: {
    type: String,
    default: 'devnet'
  }
}, {
  timestamps: true
});

// Index for finding anchor by block number
AnchorSchema.index({ fromBlock: 1, toBlock: 1 });

module.exports = mongoose.model('Anchor', AnchorSchema);
