const Reward = require('../models/Reward');
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const { ethers } = require('ethers');

// Token contract ABI (minimal for transfer)
const TOKEN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)'
];

class RewardController {
  
  // Get pending rewards for a miner
  static async getPending(req, res) {
    try {
      const { address } = req.params;
      
      const rewards = await Reward.find({ 
        miner: address.toLowerCase(),
        status: 'pending'
      }).sort({ createdAt: -1 });
      
      const total = rewards.reduce((sum, r) => sum + BigInt(r.amount), 0n);
      
      res.json({ 
        rewards,
        total: total.toString(),
        count: rewards.length
      });
    } catch (error) {
      console.error('Get pending error:', error);
      res.status(500).json({ error: 'Failed to get pending rewards' });
    }
  }
  
  // Get reward history for a miner
  static async getHistory(req, res) {
    try {
      const { address } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const rewards = await Reward.find({ miner: address.toLowerCase() })
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit));
      
      const total = await Reward.countDocuments({ miner: address.toLowerCase() });
      
      res.json({ rewards, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ error: 'Failed to get reward history' });
    }
  }
  
  // Create reward for task completion
  static async createTaskReward(task) {
    if (!task.bestResponse || task.rewardDistributed) {
      return null;
    }
    
    const rewardPool = BigInt(task.rewardPool || '0');
    if (rewardPool <= 0n) {
      return null;
    }
    
    // Distribute rewards
    // Best response gets 70% of pool
    // Other responses with score > 50 split 30%
    
    const rewards = [];
    const bestMiner = task.bestResponse.miner;
    const bestReward = (rewardPool * 70n) / 100n;
    
    rewards.push(new Reward({
      miner: bestMiner,
      amount: bestReward.toString(),
      task: task._id,
      type: 'task_completion'
    }));
    
    // Distribute remaining to others
    const otherMiners = task.responses.filter(r => 
      r.miner !== bestMiner && r.score >= 50
    );
    
    if (otherMiners.length > 0) {
      const remaining = rewardPool - bestReward;
      const perMiner = remaining / BigInt(otherMiners.length);
      
      for (const response of otherMiners) {
        rewards.push(new Reward({
          miner: response.miner,
          amount: perMiner.toString(),
          task: task._id,
          type: 'task_completion'
        }));
      }
    }
    
    // Save all rewards
    await Reward.insertMany(rewards);
    
    // Mark task as reward distributed
    task.rewardDistributed = true;
    await task.save();
    
    // Update miner total rewards
    for (const reward of rewards) {
      await Miner.updateOne(
        { address: reward.miner },
        {
          $inc: { 
            'stats.totalRewards': reward.amount 
          }
        }
      );
    }
    
    return rewards;
  }
  
  // Distribute pending rewards on-chain (batch)
  static async distribute(req, res) {
    try {
      const { privateKey, tokenAddress } = req.body;
      
      if (!privateKey || !tokenAddress) {
        return res.status(400).json({ error: 'Missing privateKey or tokenAddress' });
      }
      
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
      const wallet = new ethers.Wallet(privateKey, provider);
      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
      
      // Get pending rewards
      const pendingRewards = await Reward.find({ status: 'pending' }).limit(100);
      
      if (pendingRewards.length === 0) {
        return res.json({ message: 'No pending rewards to distribute' });
      }
      
      // Group by miner
      const grouped = {};
      for (const reward of pendingRewards) {
        if (!grouped[reward.miner]) {
          grouped[reward.miner] = { total: 0n, rewards: [] };
        }
        grouped[reward.miner].total += BigInt(reward.amount);
        grouped[reward.miner].rewards.push(reward);
      }
      
      const results = [];
      
      // Distribute to each miner
      for (const [miner, data] of Object.entries(grouped)) {
        try {
          // Update status to processing
          await Reward.updateMany(
            { _id: { $in: data.rewards.map(r => r._id) } },
            { status: 'processing' }
          );
          
          // Send tokens
          const tx = await tokenContract.transfer(miner, data.total);
          const receipt = await tx.wait();
          
          // Update status to distributed
          await Reward.updateMany(
            { _id: { $in: data.rewards.map(r => r._id) } },
            { 
              status: 'distributed',
              txHash: receipt.hash,
              distributedAt: new Date()
            }
          );
          
          results.push({
            miner,
            amount: data.total.toString(),
            txHash: receipt.hash,
            success: true
          });
        } catch (error) {
          // Mark as failed
          await Reward.updateMany(
            { _id: { $in: data.rewards.map(r => r._id) } },
            { status: 'failed' }
          );
          
          results.push({
            miner,
            amount: data.total.toString(),
            error: error.message,
            success: false
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error('Distribute error:', error);
      res.status(500).json({ error: 'Distribution failed' });
    }
  }
  
  // Get global reward stats
  static async getStats(req, res) {
    try {
      const totalDistributed = await Reward.aggregate([
        { $match: { status: 'distributed' } },
        { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } }
      ]);
      
      const totalPending = await Reward.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } }
      ]);
      
      const rewardsByType = await Reward.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: { $toLong: '$amount' } } } }
      ]);
      
      res.json({
        totalDistributed: totalDistributed[0]?.total?.toString() || '0',
        totalPending: totalPending[0]?.total?.toString() || '0',
        byType: rewardsByType
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
}

module.exports = { RewardController };
