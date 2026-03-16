
// Solana anchor check - runs every 2 minutes
const solanaAnchor = require('./solanaAnchor');
cron.schedule('*/2 * * * *', async () => {
  try {
    const result = await solanaAnchor.checkAndAnchor();
    if (result) {
      console.log('[Cron] Anchored to Solana:', result.signature);
    }
  } catch (error) {
    console.error('[Cron] Anchor check failed:', error.message);
  }
});

// Cleanup stale miners - mark offline after 5 min
cron.schedule('* * * * *', async () => {
  try {
    const Miner = require('../models/Miner');
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    
    const result = await Miner.updateMany(
      { status: 'online', lastSeen: { $lt: cutoff } },
      { $set: { status: 'offline' } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`[Cleanup] Set ${result.modifiedCount} stale miners to offline`);
    }
  } catch (error) {
    console.error('[Cleanup] Error:', error.message);
  }
});
