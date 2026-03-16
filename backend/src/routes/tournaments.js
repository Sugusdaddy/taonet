const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Miner = require('../models/Miner');
const Reward = require('../models/Reward');

// Get active tournaments
router.get('/active', async (req, res) => {
  try {
    const tournaments = await Tournament.find({ 
      status: { $in: ['active', 'upcoming'] },
      endTime: { $gt: new Date() }
    }).sort({ startTime: 1 });
    
    res.json({ tournaments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({ tournament });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tournament' });
  }
});

// Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const tournament = await Tournament.findById(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Sort leaderboard by score
    const leaderboard = tournament.leaderboard
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit))
      .map((entry, index) => ({
        rank: index + 1,
        miner: entry.miner,
        score: entry.score,
        tasksCompleted: entry.tasksCompleted,
        avgQuality: entry.avgQuality
      }));
    
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get past tournaments
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tournaments = await Tournament.find({ status: 'completed' })
      .sort({ endTime: -1 })
      .limit(parseInt(limit));
    
    res.json({ 
      tournaments: tournaments.map(t => ({
        id: t._id,
        name: t.name,
        type: t.type,
        prizePool: t.prizePool,
        winners: t.winners.slice(0, 3),
        endTime: t.endTime
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tournament history' });
  }
});

// Create a tournament (admin only - for now just allow it)
router.post('/create', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      type = 'weekly',
      startTime,
      endTime,
      prizePool,
      requirements = {}
    } = req.body;
    
    if (!name || !startTime || !endTime || !prizePool) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Default prize distribution (50/30/20)
    const prizes = [
      { rank: 1, percentage: 50 },
      { rank: 2, percentage: 30 },
      { rank: 3, percentage: 20 }
    ].map(p => ({
      ...p,
      amount: (BigInt(prizePool) * BigInt(p.percentage) / 100n).toString()
    }));
    
    const tournament = new Tournament({
      name,
      description,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      prizePool,
      prizes,
      requirements,
      status: new Date(startTime) > new Date() ? 'upcoming' : 'active'
    });
    
    await tournament.save();
    
    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Update tournament score for a miner
async function updateTournamentScore(minerAddress, taskScore, responseTime) {
  try {
    const now = new Date();
    
    // Find active tournaments
    const tournaments = await Tournament.find({
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gt: now }
    });
    
    for (const tournament of tournaments) {
      // Check if miner meets requirements
      const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
      if (!miner) continue;
      
      const reqs = tournament.requirements;
      if (reqs.minLevel && miner.level < reqs.minLevel) continue;
      if (reqs.minReputation && miner.reputation < reqs.minReputation) continue;
      
      // Calculate score
      const scoring = tournament.scoring;
      let score = scoring.taskCompletion; // Base points
      score += (taskScore || 0) * scoring.qualityBonus;
      if (responseTime < 2000) score += scoring.speedBonus;
      score *= (1 + (miner.currentStreak - 1) * (scoring.streakBonus / 100));
      
      // Update leaderboard
      const existingEntry = tournament.leaderboard.find(e => e.miner === minerAddress.toLowerCase());
      
      if (existingEntry) {
        existingEntry.score += Math.floor(score);
        existingEntry.tasksCompleted += 1;
        existingEntry.avgQuality = Math.floor(
          (existingEntry.avgQuality * (existingEntry.tasksCompleted - 1) + (taskScore || 50)) / 
          existingEntry.tasksCompleted
        );
        existingEntry.lastUpdated = now;
      } else {
        tournament.leaderboard.push({
          miner: minerAddress.toLowerCase(),
          score: Math.floor(score),
          tasksCompleted: 1,
          avgQuality: taskScore || 50,
          lastUpdated: now
        });
      }
      
      await tournament.save();
    }
  } catch (error) {
    console.error('Update tournament score error:', error);
  }
}

// Finalize tournament and distribute rewards
async function finalizeTournament(tournamentId) {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status !== 'active') return;
    
    // Sort leaderboard
    tournament.leaderboard.sort((a, b) => b.score - a.score);
    
    // Determine winners
    const winners = [];
    for (let i = 0; i < Math.min(tournament.prizes.length, tournament.leaderboard.length); i++) {
      const prize = tournament.prizes[i];
      const entry = tournament.leaderboard[i];
      
      winners.push({
        rank: i + 1,
        miner: entry.miner,
        score: entry.score,
        prize: prize.amount
      });
      
      // Create reward
      const reward = new Reward({
        miner: entry.miner,
        type: 'tournament',
        amount: prize.amount,
        tournament: tournament._id,
        xpEarned: [1000, 500, 250][i] || 100,
        status: 'pending',
        notes: `${tournament.name} - Rank #${i + 1}`
      });
      await reward.save();
      
      // Update miner stats
      const miner = await Miner.findOne({ address: entry.miner });
      if (miner) {
        miner.stats.tournamentWins = (miner.stats.tournamentWins || 0) + (i === 0 ? 1 : 0);
        await miner.save();
      }
    }
    
    tournament.winners = winners;
    tournament.status = 'completed';
    await tournament.save();
    
    console.log(`Tournament ${tournament.name} finalized with ${winners.length} winners`);
    return winners;
  } catch (error) {
    console.error('Finalize tournament error:', error);
  }
}

// Check and finalize ended tournaments
async function checkTournaments() {
  try {
    const now = new Date();
    const endedTournaments = await Tournament.find({
      status: 'active',
      endTime: { $lte: now }
    });
    
    for (const tournament of endedTournaments) {
      await finalizeTournament(tournament._id);
    }
    
    // Activate upcoming tournaments
    await Tournament.updateMany(
      { status: 'upcoming', startTime: { $lte: now } },
      { status: 'active' }
    );
  } catch (error) {
    console.error('Check tournaments error:', error);
  }
}

// Run check every minute
setInterval(checkTournaments, 60000);

module.exports = router;
module.exports.updateTournamentScore = updateTournamentScore;
module.exports.finalizeTournament = finalizeTournament;
