const Validation = require('../models/Validation');
const Task = require('../models/Task');
const Miner = require('../models/Miner');
const Reward = require('../models/Reward');

class ValidationController {
  
  // Submit validation for a task response
  static async submitValidation(req, res) {
    try {
      const { taskId, responseIndex, validator, signature, scores } = req.body;
      
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (!task.responses[responseIndex]) {
        return res.status(400).json({ error: 'Invalid response index' });
      }
      
      const response = task.responses[responseIndex];
      
      // Create validation record
      const validation = new Validation({
        task: taskId,
        miner: response.miner,
        validator: validator.toLowerCase(),
        scores: {
          accuracy: scores.accuracy || 0,
          relevance: scores.relevance || 0,
          completeness: scores.completeness || 0,
          speed: scores.speed || 0
        }
      });
      
      await validation.save();
      
      // Update response with validation
      task.responses[responseIndex].validations = task.responses[responseIndex].validations || [];
      task.responses[responseIndex].validations.push(validation._id);
      
      // Calculate average score for this response
      const validations = await Validation.find({ 
        task: taskId, 
        miner: response.miner 
      });
      
      const avgScore = validations.reduce((sum, v) => {
        return sum + (v.scores.accuracy + v.scores.relevance + v.scores.completeness + v.scores.speed) / 4;
      }, 0) / validations.length;
      
      task.responses[responseIndex].score = Math.round(avgScore);
      
      // Check if we have enough validations to finalize
      await ValidationController.checkAndFinalizeTask(task);
      
      res.json({ 
        success: true, 
        validation: {
          id: validation._id,
          scores: validation.scores,
          avgScore
        }
      });
    } catch (error) {
      console.error('Submit validation error:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  }
  
  // Check if task can be finalized
  static async checkAndFinalizeTask(task) {
    const MIN_VALIDATIONS = 3;
    
    // Check each response has enough validations
    let allValidated = true;
    for (const response of task.responses) {
      if (!response.validations || response.validations.length < MIN_VALIDATIONS) {
        allValidated = false;
        break;
      }
    }
    
    if (!allValidated || task.responses.length === 0) {
      await task.save();
      return;
    }
    
    // Find best response
    const best = task.responses.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
    
    task.bestResponse = {
      miner: best.miner,
      response: best.response,
      score: best.score
    };
    
    task.status = 'completed';
    task.completedAt = new Date();
    
    await task.save();
    
    // Update miner stats
    for (const response of task.responses) {
      await Miner.updateOne(
        { address: response.miner },
        {
          $inc: { 
            'stats.completedTasks': 1,
            'stats.successfulTasks': response.score >= 50 ? 1 : 0,
            'stats.failedTasks': response.score < 50 ? 1 : 0
          }
        }
      );
      
      // Recalculate average score
      await ValidationController.updateMinerAverageScore(response.miner);
    }
    
    // Create rewards
    await ValidationController.createRewards(task);
  }
  
  // Update miner's average score
  static async updateMinerAverageScore(minerAddress) {
    const validations = await Validation.find({ miner: minerAddress }).sort({ createdAt: -1 }).limit(100);
    
    if (validations.length === 0) return;
    
    const avgScore = validations.reduce((sum, v) => {
      return sum + (v.scores.accuracy + v.scores.relevance + v.scores.completeness + v.scores.speed) / 4;
    }, 0) / validations.length;
    
    // Update reputation based on score
    let reputationDelta = 0;
    if (avgScore >= 80) reputationDelta = 1;
    else if (avgScore >= 60) reputationDelta = 0;
    else reputationDelta = -1;
    
    await Miner.updateOne(
      { address: minerAddress },
      {
        'stats.averageScore': Math.round(avgScore),
        $inc: { reputation: reputationDelta }
      }
    );
    
    // Cap reputation between 0 and 100
    await Miner.updateOne(
      { address: minerAddress, reputation: { $gt: 100 } },
      { reputation: 100 }
    );
    await Miner.updateOne(
      { address: minerAddress, reputation: { $lt: 0 } },
      { reputation: 0 }
    );
  }
  
  // Create rewards for completed task
  static async createRewards(task) {
    if (task.rewardDistributed) return;
    
    const rewardPool = BigInt(task.rewardPool || '0');
    if (rewardPool <= 0n) {
      task.rewardDistributed = true;
      await task.save();
      return;
    }
    
    const rewards = [];
    
    // Best response gets 60%
    const bestReward = (rewardPool * 60n) / 100n;
    rewards.push({
      miner: task.bestResponse.miner,
      amount: bestReward.toString(),
      task: task._id,
      type: 'task_winner'
    });
    
    // Other good responses split 25%
    const goodResponses = task.responses.filter(r => 
      r.miner !== task.bestResponse.miner && r.score >= 50
    );
    
    if (goodResponses.length > 0) {
      const participantPool = (rewardPool * 25n) / 100n;
      const perParticipant = participantPool / BigInt(goodResponses.length);
      
      for (const response of goodResponses) {
        rewards.push({
          miner: response.miner,
          amount: perParticipant.toString(),
          task: task._id,
          type: 'task_participant'
        });
      }
    }
    
    // Validators split 15%
    const validatorPool = (rewardPool * 15n) / 100n;
    const validations = await Validation.find({ task: task._id });
    const uniqueValidators = [...new Set(validations.map(v => v.validator))];
    
    if (uniqueValidators.length > 0) {
      const perValidator = validatorPool / BigInt(uniqueValidators.length);
      
      for (const validator of uniqueValidators) {
        rewards.push({
          miner: validator,
          amount: perValidator.toString(),
          task: task._id,
          type: 'validation'
        });
      }
    }
    
    // Save rewards
    await Reward.insertMany(rewards);
    
    // Update miner total rewards
    for (const reward of rewards) {
      await Miner.updateOne(
        { address: reward.miner },
        { $inc: { 'stats.totalRewards': reward.amount } }
      );
    }
    
    task.rewardDistributed = true;
    await task.save();
  }
  
  // Get validations for a task
  static async getTaskValidations(req, res) {
    try {
      const { taskId } = req.params;
      
      const validations = await Validation.find({ task: taskId })
        .sort({ createdAt: -1 });
      
      res.json({ validations });
    } catch (error) {
      console.error('Get validations error:', error);
      res.status(500).json({ error: 'Failed to get validations' });
    }
  }
  
  // Get validator stats
  static async getValidatorStats(req, res) {
    try {
      const { address } = req.params;
      
      const validations = await Validation.find({ validator: address.toLowerCase() });
      
      const stats = {
        totalValidations: validations.length,
        tasksValidated: new Set(validations.map(v => v.task.toString())).size,
        avgScoreGiven: validations.length > 0 
          ? validations.reduce((sum, v) => sum + (v.scores.accuracy + v.scores.relevance + v.scores.completeness + v.scores.speed) / 4, 0) / validations.length
          : 0
      };
      
      res.json({ stats });
    } catch (error) {
      console.error('Get validator stats error:', error);
      res.status(500).json({ error: 'Failed to get validator stats' });
    }
  }
  
  // Auto-validate with AI (for demo/bootstrap)
  static async autoValidate(taskId) {
    const task = await Task.findById(taskId);
    if (!task || task.responses.length === 0) return;
    
    for (let i = 0; i < task.responses.length; i++) {
      const response = task.responses[i];
      
      // Generate scores based on response characteristics
      let accuracy = 50;
      let relevance = 50;
      let completeness = 50;
      let speed = 50;
      
      if (response.response) {
        const responseStr = JSON.stringify(response.response);
        
        // Length indicates completeness
        completeness = Math.min(100, 30 + Math.floor(responseStr.length / 20));
        
        // Assume relevant if there's content
        relevance = responseStr.length > 50 ? 70 : 40;
        
        // Speed bonus
        if (response.processingTime) {
          if (response.processingTime < 2000) speed = 90;
          else if (response.processingTime < 5000) speed = 70;
          else speed = 50;
        }
        
        // Accuracy estimate (would need real validation)
        accuracy = Math.min(100, 50 + Math.floor(Math.random() * 30));
      }
      
      // Create 3 auto-validations
      for (let j = 0; j < 3; j++) {
        const validation = new Validation({
          task: taskId,
          miner: response.miner,
          validator: `auto-validator-${j}`,
          scores: {
            accuracy: accuracy + Math.floor(Math.random() * 10 - 5),
            relevance: relevance + Math.floor(Math.random() * 10 - 5),
            completeness: completeness + Math.floor(Math.random() * 10 - 5),
            speed: speed
          }
        });
        await validation.save();
      }
      
      // Calculate final score
      const validations = await Validation.find({ task: taskId, miner: response.miner });
      const avgScore = validations.reduce((sum, v) => {
        return sum + (v.scores.accuracy + v.scores.relevance + v.scores.completeness + v.scores.speed) / 4;
      }, 0) / validations.length;
      
      task.responses[i].score = Math.round(avgScore);
    }
    
    // Finalize task
    if (task.responses.length > 0) {
      const best = task.responses.reduce((prev, current) => 
        (prev.score > current.score) ? prev : current
      );
      
      task.bestResponse = {
        miner: best.miner,
        response: best.response,
        score: best.score
      };
      
      task.status = 'completed';
      task.completedAt = new Date();
    }
    
    await task.save();
    
    // Create rewards
    await ValidationController.createRewards(task);
    
    return task;
  }
}

module.exports = { ValidationController };
