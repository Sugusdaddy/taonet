/**
 * Cron Jobs for TaoNet
 * Scheduled tasks for maintenance and analytics
 */

const cron = require('node-cron');
const { aggregateAnalytics } = require('./routes/analytics');
const { updateMinerTiers } = require('./tokenVerification');
const Miner = require('./models/Miner');
const Task = require('./models/Task');
const Jackpot = require('./models/Jackpot');
const Tournament = require('./models/Tournament');

// Initialize cron jobs
function initCronJobs() {
  console.log('Initializing cron jobs...');
  
  // Hourly analytics aggregation
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly analytics aggregation');
    await aggregateAnalytics('hourly');
  });
  
  // Daily analytics aggregation
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily analytics aggregation');
    await aggregateAnalytics('daily');
  });
  
  // Every 5 minutes: Check miner streaks
  cron.schedule('*/5 * * * *', async () => {
    await checkStreaks();
  });
  
  // Every 10 minutes: Refresh token balances and tiers
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Refreshing miner tiers');
    await updateMinerTiers(Miner);
  });
  
  // Every hour: Clean up expired tasks
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Cleaning up expired tasks');
    await cleanupExpiredTasks();
  });
  
  // Every hour: Update jackpot multipliers
  cron.schedule('30 * * * *', async () => {
    console.log('[Cron] Updating jackpot multipliers');
    await updateJackpotMultipliers();
  });
  
  // Every minute: Check tournament status
  cron.schedule('* * * * *', async () => {
    await checkTournaments();
  });
  
  // Daily at midnight: Reset daily bonuses
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Processing daily resets');
    await processDailyReset();
  });
  
  // Weekly on Sunday: Generate weekly report
  cron.schedule('0 0 * * 0', async () => {
    console.log('[Cron] Generating weekly report');
    await generateWeeklyReport();
  });
  
  console.log('Cron jobs initialized');
}

// Check and update streaks
async function checkStreaks() {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  
  // Find miners who haven't completed a task in 24h but have active streaks
  const minersToCheck = await Miner.find({
    currentStreak: { $gt: 0 },
    lastTaskCompletedAt: { $lt: oneDayAgo }
  });
  
  for (const miner of minersToCheck) {
    const previousStreak = miner.currentStreak;
    miner.currentStreak = 0;
    await miner.save();
    
    // Send notification about broken streak
    const { createNotification, NotificationTemplates } = require('./routes/notifications');
    const template = NotificationTemplates.streakBroken(previousStreak);
    await createNotification(miner.address, template.type, template.title, template.message, template.data);
    
    console.log(`Streak broken for ${miner.address}: ${previousStreak} days`);
  }
}

// Clean up expired/stuck tasks
async function cleanupExpiredTasks() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // Find tasks stuck in 'assigned' status
  const stuckTasks = await Task.find({
    status: 'assigned',
    assignedAt: { $lt: tenMinutesAgo }
  });
  
  for (const task of stuckTasks) {
    task.status = 'failed';
    task.error = 'Task timeout (cleanup)';
    await task.save();
    
    // Issue penalty to assigned miner
    if (task.assignedTo) {
      const { issuePenalty } = require('./penalties');
      await issuePenalty(task.assignedTo, 'task_timeout', task._id);
    }
  }
  
  console.log(`Cleaned up ${stuckTasks.length} stuck tasks`);
  
  // Find very old pending tasks
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await Task.updateMany(
    { status: 'pending', createdAt: { $lt: oneHourAgo } },
    { status: 'expired', error: 'Task expired (no miners available)' }
  );
}

// Update jackpot multipliers based on activity
async function updateJackpotMultipliers() {
  const jackpots = await Jackpot.find({ status: 'active' });
  
  for (const jackpot of jackpots) {
    // Random variation in multiplier
    const variation = (Math.random() - 0.5) * 0.1; // ±5%
    
    // Base multiplier ranges
    const ranges = {
      mini: { min: 10, max: 50 },
      regular: { min: 50, max: 200 },
      mega: { min: 200, max: 1000 },
      ultra: { min: 1000, max: 10000 }
    };
    
    const range = ranges[jackpot.type];
    jackpot.multiplier = Math.round(
      Math.min(range.max, Math.max(range.min, jackpot.multiplier * (1 + variation)))
    );
    
    await jackpot.save();
  }
}

// Check tournament status
async function checkTournaments() {
  const now = new Date();
  
  // Activate upcoming tournaments
  await Tournament.updateMany(
    { status: 'upcoming', startTime: { $lte: now } },
    { status: 'active' }
  );
  
  // Find ended tournaments
  const endedTournaments = await Tournament.find({
    status: 'active',
    endTime: { $lte: now }
  });
  
  for (const tournament of endedTournaments) {
    const { finalizeTournament } = require('./routes/tournaments');
    await finalizeTournament(tournament._id);
  }
}

// Process daily reset
async function processDailyReset() {
  // Reset daily claimed flag
  await Miner.updateMany(
    {},
    { 
      $set: { 'dailyBonus.claimed': false },
      $inc: { 'dailyBonus.consecutiveDays': 1 }
    }
  );
  
  // Reset miners who haven't claimed yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  await Miner.updateMany(
    { 'dailyBonus.lastClaimed': { $lt: yesterday } },
    { 'dailyBonus.consecutiveDays': 0 }
  );
  
  console.log('Daily reset processed');
}

// Generate weekly report
async function generateWeeklyReport() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Aggregate weekly stats
  const taskStats = await Task.aggregate([
    { $match: { createdAt: { $gte: oneWeekAgo } } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      avgResponseTime: { $avg: '$responseTime' }
    }}
  ]);
  
  const newMiners = await Miner.countDocuments({ createdAt: { $gte: oneWeekAgo } });
  const activeMiners = await Miner.countDocuments({ 
    lastTaskCompletedAt: { $gte: oneWeekAgo } 
  });
  
  const report = {
    period: {
      start: oneWeekAgo,
      end: new Date()
    },
    tasks: taskStats[0] || { total: 0, completed: 0 },
    miners: {
      new: newMiners,
      active: activeMiners
    },
    generatedAt: new Date()
  };
  
  console.log('Weekly Report:', JSON.stringify(report, null, 2));
  
  // Could save to database or send notification
  return report;
}

module.exports = { initCronJobs };
