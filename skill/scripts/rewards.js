#!/usr/bin/env node
/**
 * TaoNet Rewards Management
 * Claim daily bonus and view reward history
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
let config = { apiUrl: 'http://204.168.139.31' };

if (fs.existsSync(configPath)) {
  config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
}

const args = process.argv.slice(2);
let action = 'status';

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--address':
    case '-a':
      config.address = args[++i];
      break;
    case '--action':
      action = args[++i];
      break;
    case 'claim':
    case 'status':
    case 'history':
      action = args[i];
      break;
  }
}

if (!config.address) {
  console.log('Error: Address required');
  process.exit(1);
}

async function claimDaily() {
  console.log('Claiming daily bonus...');
  
  try {
    const res = await fetch(`${config.apiUrl}/api/game/${config.address}/daily-bonus`, {
      method: 'POST'
    });
    const data = await res.json();
    
    if (data.success) {
      console.log('');
      console.log('[SUCCESS] Daily bonus claimed!');
      console.log(`  Tokens: +${data.amount}`);
      console.log(`  XP: +${data.xp}`);
      console.log(`  Streak: Day ${data.consecutiveDays}`);
      if (data.bonus) {
        console.log(`  Streak Bonus: +${data.bonus} tokens`);
      }
    } else {
      console.log('[INFO]', data.error || 'Already claimed today');
      if (data.nextClaimIn) {
        const hours = Math.floor(data.nextClaimIn / 3600000);
        const mins = Math.floor((data.nextClaimIn % 3600000) / 60000);
        console.log(`  Next claim in: ${hours}h ${mins}m`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function showRewardStatus() {
  console.log('='.repeat(50));
  console.log('TAONET REWARDS');
  console.log('='.repeat(50));
  console.log(`Address: ${config.address}`);
  console.log('');
  
  try {
    const profileRes = await fetch(`${config.apiUrl}/api/game/${config.address}/profile`);
    const profile = await profileRes.json();
    
    console.log('BALANCE');
    console.log('-'.repeat(30));
    console.log(`  Total Earned: ${profile.totalRewards || 0} tokens`);
    console.log(`  Pending: ${profile.pendingRewards || 0} tokens`);
    console.log('');
    
    console.log('DAILY BONUS');
    console.log('-'.repeat(30));
    console.log(`  Consecutive Days: ${profile.dailyBonus?.consecutiveDays || 0}`);
    console.log(`  Last Claimed: ${profile.dailyBonus?.lastClaimed ? new Date(profile.dailyBonus.lastClaimed).toLocaleString() : 'Never'}`);
    console.log('');
    
    // Get active jackpots
    const jpRes = await fetch(`${config.apiUrl}/api/game/jackpots/active`);
    const jp = await jpRes.json();
    
    console.log('JACKPOTS');
    console.log('-'.repeat(30));
    (jp.jackpots || []).forEach(j => {
      console.log(`  ${j.type.toUpperCase()}: ${j.multiplier}x (${j.progress}% to trigger)`);
    });
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('='.repeat(50));
}

async function showHistory() {
  console.log('Reward history coming soon...');
  // Could implement by fetching completed tasks with rewards
}

// Execute action
switch (action) {
  case 'claim':
    claimDaily();
    break;
  case 'history':
    showHistory();
    break;
  default:
    showRewardStatus();
}
