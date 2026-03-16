
// Get difficulty tiers info
router.get('/difficulty/tiers', async (req, res) => {
  try {
    const TaskDifficulty = require('../services/taskDifficulty');
    const tiers = TaskDifficulty.getAllTiers();
    res.json({ tiers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
