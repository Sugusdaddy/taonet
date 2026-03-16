const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Get notifications for a miner
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50, unreadOnly = false, type } = req.query;
    
    const query = { miner: address.toLowerCase() };
    if (unreadOnly === 'true') query.read = false;
    if (type) query.type = type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      miner: address.toLowerCase(), 
      read: false 
    });
    
    res.json({ 
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.post('/:address/read/:id', async (req, res) => {
  try {
    const { address, id } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, miner: address.toLowerCase() },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all notifications as read
router.post('/:address/read-all', async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await Notification.updateMany(
      { miner: address.toLowerCase(), read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ success: true, marked: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete old notifications
router.delete('/:address/clear', async (req, res) => {
  try {
    const { address } = req.params;
    const { olderThanDays = 30 } = req.query;
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(olderThanDays));
    
    const result = await Notification.deleteMany({
      miner: address.toLowerCase(),
      read: true,
      createdAt: { $lt: cutoff }
    });
    
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Helper function to create notification
async function createNotification(miner, type, title, message, data = {}, priority = 'normal') {
  try {
    const notification = new Notification({
      miner: miner.toLowerCase(),
      type,
      title,
      message,
      data,
      priority
    });
    await notification.save();
    
    // Broadcast via WebSocket if miner is online
    const minerWs = global.activeMiners?.get(miner.toLowerCase());
    if (minerWs && minerWs.readyState === 1) {
      minerWs.send(JSON.stringify({
        type: 'notification',
        notification: {
          id: notification._id,
          type,
          title,
          message,
          data,
          priority,
          createdAt: notification.createdAt
        }
      }));
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

// Notification templates
const NotificationTemplates = {
  achievementUnlocked: (achievement) => ({
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked',
    message: `You unlocked "${achievement.name}" and earned ${achievement.xpReward} XP!`,
    data: { achievementId: achievement.id, xp: achievement.xpReward },
    priority: 'normal'
  }),
  
  jackpotWon: (jackpotType, amount, multiplier) => ({
    type: 'jackpot_won',
    title: `${jackpotType.toUpperCase()} JACKPOT WON!`,
    message: `Congratulations! You won ${amount} tokens with a ${multiplier}x multiplier!`,
    data: { jackpotType, amount, multiplier },
    priority: 'urgent'
  }),
  
  levelUp: (newLevel, xpNeeded) => ({
    type: 'level_up',
    title: 'Level Up!',
    message: `You reached Level ${newLevel}! Your rewards multiplier has increased.`,
    data: { level: newLevel, nextLevelXp: xpNeeded },
    priority: 'high'
  }),
  
  streakMilestone: (days) => ({
    type: 'streak_milestone',
    title: 'Streak Milestone',
    message: `Amazing! You've maintained a ${days}-day mining streak!`,
    data: { days },
    priority: 'normal'
  }),
  
  streakBroken: (previousStreak) => ({
    type: 'streak_broken',
    title: 'Streak Lost',
    message: `Your ${previousStreak}-day streak was broken. Start a new one today!`,
    data: { previousStreak },
    priority: 'normal'
  }),
  
  referralJoined: (referralAddress) => ({
    type: 'referral_joined',
    title: 'New Referral',
    message: `Someone joined using your referral code! You both received bonuses.`,
    data: { referral: referralAddress },
    priority: 'normal'
  }),
  
  tierUpgrade: (newTier, multiplier) => ({
    type: 'tier_upgrade',
    title: 'Tier Upgraded',
    message: `You've been promoted to ${newTier.toUpperCase()} tier with ${multiplier}x multiplier!`,
    data: { tier: newTier, multiplier },
    priority: 'high'
  }),
  
  tournamentStarted: (tournament) => ({
    type: 'tournament_started',
    title: 'Tournament Started',
    message: `"${tournament.name}" has begun! Compete now for ${tournament.prizePool} tokens.`,
    data: { tournamentId: tournament._id, name: tournament.name },
    priority: 'high'
  }),
  
  tournamentEnded: (tournament, rank, prize) => ({
    type: 'tournament_ended',
    title: 'Tournament Ended',
    message: rank <= 3 
      ? `You finished #${rank} in "${tournament.name}" and won ${prize} tokens!`
      : `"${tournament.name}" has ended. You finished #${rank}.`,
    data: { tournamentId: tournament._id, rank, prize },
    priority: rank <= 3 ? 'urgent' : 'normal'
  })
};

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.NotificationTemplates = NotificationTemplates;
