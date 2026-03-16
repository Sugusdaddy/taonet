#!/usr/bin/env node
/**
 * TaoNet Miner Status
 * Check your mining stats and rewards
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
let config = { apiUrl: 'http://204.168.139.31' };

if (fs.existsSync(configPath)) {
  config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--address' || args[i] === '-a') config.address = args[++i];
}

if (!config.address) {
  console.log('Error: Address required');
  process.exit(1);
}

async function getStatus() {
  console.log('='.repeat(50));
  console.log('TAONET MINER STATUS');
  console.log('='.repeat(50));
  console.log(`Address: ${config.address}`);
  console.log('');
  
  try {
    // Get miner profile
    const profileRes = await fetch(`${config.apiUrl}/api/game/${config.address}/profile`);
    const profile = await profileRes.json();
    
    console.log('PROFILE');
    console.log('-'.repeat(30));
    console.log(`  Name: ${profile.name || 'Unknown'}`);
    console.log(`  Level: ${profile.level || 1}`);
    console.log(`  XP: ${profile.xp || 0} / ${profile.xpToNextLevel || 100}`);
    console.log(`  Tier: ${(profile.stakingTier || 'bronze').toUpperCase()}`);
    console.log(`  Reputation: ${profile.reputation || 0}`);
    console.log('');
    
    console.log('MINING STATS');
    console.log('-'.repeat(30));
    console.log(`  Tasks Completed: ${profile.tasksCompleted || 0}`);
    console.log(`  Current Streak: ${profile.currentStreak || 0} days`);
    console.log(`  Longest Streak: ${profile.longestStreak || 0} days`);
    console.log(`  Total Rewards: ${profile.totalRewards || 0} tokens`);
    console.log('');
    
    // Get leaderboard rank
    const lbRes = await fetch(`${config.apiUrl}/api/miners/leaderboard?limit=100`);
    const lb = await lbRes.json();
    const rank = (lb.miners || []).findIndex(m => 
      m.address.toLowerCase() === config.address.toLowerCase()
    ) + 1;
    
    console.log('RANKING');
    console.log('-'.repeat(30));
    console.log(`  Network Rank: ${rank > 0 ? `#${rank}` : 'Unranked'}`);
    console.log('');
    
    // Get achievements
    const achRes = await fetch(`${config.apiUrl}/api/game/${config.address}/achievements`);
    const ach = await achRes.json();
    const unlocked = (ach.achievements || []).filter(a => a.unlocked).length;
    const total = (ach.achievements || []).length;
    
    console.log('ACHIEVEMENTS');
    console.log('-'.repeat(30));
    console.log(`  Unlocked: ${unlocked} / ${total}`);
    console.log('');
    
    // Calculate multipliers
    const tierMult = { bronze: 1.0, silver: 1.25, gold: 1.5, platinum: 2.0, diamond: 3.0 }[profile.stakingTier || 'bronze'];
    const streakMult = Math.min(2.0, 1 + (profile.currentStreak || 0) * 0.033);
    const levelMult = 1 + ((profile.level || 1) - 1) * 0.05;
    const totalMult = (tierMult * streakMult * levelMult).toFixed(2);
    
    console.log('MULTIPLIERS');
    console.log('-'.repeat(30));
    console.log(`  Tier: ${tierMult}x`);
    console.log(`  Streak: ${streakMult.toFixed(2)}x`);
    console.log(`  Level: ${levelMult.toFixed(2)}x`);
    console.log(`  TOTAL: ${totalMult}x`);
    console.log('');
    
  } catch (error) {
    console.error('Error fetching status:', error.message);
  }
  
  console.log('='.repeat(50));
}

getStatus();
