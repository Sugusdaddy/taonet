const Miner = require('./models/Miner');
const Task = require('./models/Task');
const InferenceProof = require('./models/InferenceProof');
const RewardEngine = require('./services/rewardEngine');
const crypto = require('crypto');

async function handleWebSocketMessage(ws, message) {
  const { type } = message;
  
  switch (type) {
    case 'auth':
      await handleAuth(ws, message);
      break;
    case 'heartbeat':
      await handleHeartbeat(ws, message);
      break;
    case 'response':
      await handleTaskResponse(ws, message);
      break;
    case 'ready':
      ws.isBusy = false;
      break;
    default:
      console.log('[WS] Unknown message type:', type);
  }
}

async function handleAuth(ws, message) {
  const { address, capabilities } = message;
  if (!address) {
    ws.send(JSON.stringify({ type: 'error', message: 'Address required' }));
    return;
  }
  
  const addr = address.toLowerCase();
  ws.minerAddress = addr;
  ws.capabilities = capabilities || {};
  ws.isBusy = false;
  
  // Update/create miner
  let miner = await Miner.findOne({ address: addr });
  if (!miner) {
    miner = new Miner({ address: addr, status: 'online' });
    await miner.save();
  } else {
    miner.status = 'online';
    miner.lastSeen = new Date();
    await miner.save();
  }
  
  // Store in global map
  if (!global.activeMiners) global.activeMiners = new Map();
  global.activeMiners.set(addr, { ws, miner, joinedAt: new Date() });
  
  console.log(`[WS] Miner authenticated: ${addr.slice(0,8)}...`);
  
  ws.send(JSON.stringify({
    type: 'auth_success',
    miner: {
      address: miner.address,
      level: miner.level,
      xp: miner.xp
    }
  }));
}

async function handleHeartbeat(ws, message) {
  if (!ws.minerAddress) return;
  
  ws.isAlive = true;
  
  await Miner.updateOne(
    { address: ws.minerAddress },
    { lastSeen: new Date(), status: 'online' }
  );
  
  ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
}

async function handleTaskResponse(ws, message) {
  const { taskId, response, processingTime, modelInfo } = message;
  
  if (!taskId || !response) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid response' }));
    return;
  }
  
  // Mark miner as not busy
  ws.isBusy = false;
  
  // Check for playground callback first
  if (global.playgroundCallbacks?.has(taskId)) {
    const callback = global.playgroundCallbacks.get(taskId);
    clearTimeout(callback.timeout);
    callback.resolve({ response, processingTime });
    global.playgroundCallbacks.delete(taskId);
  }
  
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      ws.send(JSON.stringify({ type: 'error', message: 'Task not found' }));
      return;
    }
    
    const miner = await Miner.findOne({ address: ws.minerAddress });
    if (!miner) return;
    
    // Create hashes for proof
    const inputHash = crypto.createHash('sha256').update(task.prompt).digest('hex');
    const outputHash = crypto.createHash('sha256').update(response).digest('hex');
    const combinedHash = crypto.createHash('sha256').update(inputHash + outputHash).digest('hex');
    
    // Store response
    task.responses = task.responses || [];
    task.responses.push({
      miner: ws.minerAddress,
      response,
      responseTime: processingTime || 0,
      timestamp: new Date()
    });
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();
    
    // Create inference proof
    const proof = new InferenceProof({
      miner: ws.minerAddress,
      task: task._id,
      inputHash,
      outputHash,
      combinedHash,
      nonce: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
      blockHeight: await InferenceProof.countDocuments() + 1,
      previousHash: (await InferenceProof.findOne().sort({ blockHeight: -1 }))?.combinedHash || '0'.repeat(64),
      modelInfo: modelInfo || { name: 'llama-3.2-1b', parameters: '1B' },
      processingTime: processingTime || 0,
      verified: true
    });
    await proof.save();
    
    // Calculate and apply rewards
    const rewardResult = RewardEngine.calculateReward({
      baseReward: BigInt(task.rewardPool || '1000000000000000000'),
      miner,
      responseTime: processingTime || 5000,
      qualityScore: 80,
      taskType: task.type || 'text'
    });
    
    // Update miner stats
    miner.stats.completedTasks = (miner.stats.completedTasks || 0) + 1;
    miner.stats.totalRewards = (BigInt(miner.stats.totalRewards || 0) + rewardResult.finalReward).toString();
    miner.xp = (miner.xp || 0) + rewardResult.xpEarned;
    miner.lastSeen = new Date();
    
    // Check level up
    const xpNeeded = RewardEngine.getXpForLevel(miner.level + 1);
    if (miner.xp >= xpNeeded) {
      miner.level++;
      miner.xp -= xpNeeded;
    }
    
    await miner.save();
    
    console.log(`[WS] Task ${taskId.slice(-6)} completed by ${ws.minerAddress.slice(0,8)} - reward: ${rewardResult.finalReward.toString()}`);
    
    ws.send(JSON.stringify({
      type: 'task_accepted',
      taskId,
      reward: rewardResult.finalReward.toString(),
      xp: rewardResult.xpEarned,
      proofId: proof._id
    }));
    
  } catch (error) {
    console.error('[WS] Task response error:', error.message);
  }
}

module.exports = { handleWebSocketMessage };
