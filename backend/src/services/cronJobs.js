
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
