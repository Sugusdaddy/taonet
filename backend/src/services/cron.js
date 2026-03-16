const cron = require('node-cron');
const Miner = require('../models/Miner');
const { ensureMinTasks } = require('./taskGenerator');

function initCronJobs() {
  // Refresh miner tiers every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Refreshing miner tiers');
    try {
      // Update offline status for inactive miners
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await Miner.updateMany(
        { lastSeen: { $lt: tenMinutesAgo }, status: 'online' },
        { $set: { status: 'offline' } }
      );
    } catch (err) {
      console.error('[Cron] Tier refresh error:', err);
    }
  });

  // Ensure minimum tasks every 10 seconds
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await ensureMinTasks(10);
    } catch (err) {
      console.error('[Cron] Task gen error:', err);
    }
  });

  console.log('[Cron] Jobs scheduled');
}

module.exports = { initCronJobs };
