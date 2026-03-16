const mongoose = require("mongoose");
const crypto = require("crypto");

const InferenceProofSchema = new mongoose.Schema({
  // Block-like structure
  blockNumber: { type: Number, required: true, unique: true },
  blockHash: { type: String, required: true, unique: true },
  previousHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  
  // Inference data
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  miner: { type: String, required: true },
  
  // Input/Output hashes (verifiable)
  inputHash: { type: String, required: true },      // SHA256 of prompt
  outputHash: { type: String, required: true },     // SHA256 of response
  
  // Full data (for verification)
  input: { type: String, required: true },          // Original prompt
  output: { type: String, required: true },         // AI response
  
  // Metrics
  tokensGenerated: { type: Number, default: 0 },
  processingTimeMs: { type: Number, default: 0 },
  model: { type: String, default: "Llama-3.2-1B" },
  
  // Merkle proof (for batching)
  merkleRoot: String,
  proofIndex: Number,
  
  // Signature from miner
  minerSignature: String,
  
  // Reward
  reward: { type: String, default: "0" },
  
  // Status
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: String
});

// Indexes
InferenceProofSchema.index({ blockNumber: -1 });
InferenceProofSchema.index({ miner: 1, timestamp: -1 });
InferenceProofSchema.index({ taskId: 1 });
InferenceProofSchema.index({ blockHash: 1 });

// Static: Create proof for an inference
InferenceProofSchema.statics.createProof = async function(taskId, miner, input, output, metrics) {
  // Get last block
  const lastBlock = await this.findOne().sort({ blockNumber: -1 });
  const blockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
  const previousHash = lastBlock ? lastBlock.blockHash : "0x0000000000000000000000000000000000000000000000000000000000000000";
  
  // Create hashes
  const inputHash = "0x" + crypto.createHash("sha256").update(input).digest("hex");
  const outputHash = "0x" + crypto.createHash("sha256").update(output).digest("hex");
  
  // Create block hash (hash of all data)
  const blockData = `${blockNumber}:${previousHash}:${taskId}:${miner}:${inputHash}:${outputHash}:${Date.now()}`;
  const blockHash = "0x" + crypto.createHash("sha256").update(blockData).digest("hex");
  
  const proof = new this({
    blockNumber,
    blockHash,
    previousHash,
    taskId,
    miner,
    inputHash,
    outputHash,
    input,
    output,
    tokensGenerated: metrics.tokensGenerated || 0,
    processingTimeMs: metrics.processingTimeMs || 0,
    model: metrics.model || "Llama-3.2-1B"
  });
  
  await proof.save();
  return proof;
};

// Static: Verify a proof
InferenceProofSchema.statics.verifyProof = async function(blockHash) {
  const proof = await this.findOne({ blockHash });
  if (!proof) return { valid: false, error: "Proof not found" };
  
  // Verify input hash
  const computedInputHash = "0x" + crypto.createHash("sha256").update(proof.input).digest("hex");
  if (computedInputHash !== proof.inputHash) {
    return { valid: false, error: "Input hash mismatch" };
  }
  
  // Verify output hash  
  const computedOutputHash = "0x" + crypto.createHash("sha256").update(proof.output).digest("hex");
  if (computedOutputHash !== proof.outputHash) {
    return { valid: false, error: "Output hash mismatch" };
  }
  
  // Verify chain link
  if (proof.blockNumber > 1) {
    const prevBlock = await this.findOne({ blockNumber: proof.blockNumber - 1 });
    if (!prevBlock || prevBlock.blockHash !== proof.previousHash) {
      return { valid: false, error: "Chain broken - previous hash mismatch" };
    }
  }
  
  return { 
    valid: true, 
    proof: {
      blockNumber: proof.blockNumber,
      blockHash: proof.blockHash,
      inputHash: proof.inputHash,
      outputHash: proof.outputHash,
      miner: proof.miner,
      timestamp: proof.timestamp
    }
  };
};

module.exports = mongoose.model("InferenceProof", InferenceProofSchema);
