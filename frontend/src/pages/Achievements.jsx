import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import './Achievements.css';

const ACHIEVEMENTS = [
  // Mining Milestones
  {
    id: 'first_task',
    name: 'First Steps',
    description: 'Complete your first mining task',
    icon: '🎯',
    category: 'mining',
    reward: 100,
    requirement: { type: 'tasks', value: 1 }
  },
  {
    id: 'tasks_10',
    name: 'Getting Started',
    description: 'Complete 10 mining tasks',
    icon: '⚡',
    category: 'mining',
    reward: 250,
    requirement: { type: 'tasks', value: 10 }
  },
  {
    id: 'tasks_100',
    name: 'Centurion',
    description: 'Complete 100 mining tasks',
    icon: '💯',
    category: 'mining',
    reward: 1000,
    requirement: { type: 'tasks', value: 100 }
  },
  {
    id: 'tasks_500',
    name: 'Task Master',
    description: 'Complete 500 mining tasks',
    icon: '🏆',
    category: 'mining',
    reward: 3000,
    requirement: { type: 'tasks', value: 500 }
  },
  {
    id: 'tasks_1000',
    name: 'Inference Legend',
    description: 'Complete 1,000 mining tasks',
    icon: '👑',
    category: 'mining',
    reward: 10000,
    requirement: { type: 'tasks', value: 1000 }
  },
  {
    id: 'tasks_5000',
    name: 'AI Overlord',
    description: 'Complete 5,000 mining tasks',
    icon: '🤖',
    category: 'mining',
    reward: 50000,
    requirement: { type: 'tasks', value: 5000 }
  },

  // Level Achievements
  {
    id: 'level_5',
    name: 'Apprentice',
    description: 'Reach level 5',
    icon: '📈',
    category: 'level',
    reward: 500,
    requirement: { type: 'level', value: 5 }
  },
  {
    id: 'level_10',
    name: 'Journeyman',
    description: 'Reach level 10',
    icon: '🎖️',
    category: 'level',
    reward: 1500,
    requirement: { type: 'level', value: 10 }
  },
  {
    id: 'level_25',
    name: 'Expert Miner',
    description: 'Reach level 25',
    icon: '⭐',
    category: 'level',
    reward: 5000,
    requirement: { type: 'level', value: 25 }
  },
  {
    id: 'level_50',
    name: 'Master Miner',
    description: 'Reach level 50',
    icon: '🌟',
    category: 'level',
    reward: 25000,
    requirement: { type: 'level', value: 50 }
  },

  // Streak Achievements
  {
    id: 'streak_3',
    name: 'Consistent',
    description: 'Maintain a 3-day mining streak',
    icon: '🔥',
    category: 'streak',
    reward: 300,
    requirement: { type: 'streak', value: 3 }
  },
  {
    id: 'streak_7',
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day mining streak',
    icon: '🔥',
    category: 'streak',
    reward: 1000,
    requirement: { type: 'streak', value: 7 }
  },
  {
    id: 'streak_30',
    name: 'Monthly Dedication',
    description: 'Maintain a 30-day mining streak',
    icon: '💪',
    category: 'streak',
    reward: 10000,
    requirement: { type: 'streak', value: 30 }
  },

  // Rewards Achievements
  {
    id: 'rewards_1k',
    name: 'Token Collector',
    description: 'Earn 1,000 TAO in total rewards',
    icon: '💰',
    category: 'rewards',
    reward: 100,
    requirement: { type: 'rewards', value: 1000 }
  },
  {
    id: 'rewards_10k',
    name: 'Crypto Rich',
    description: 'Earn 10,000 TAO in total rewards',
    icon: '💎',
    category: 'rewards',
    reward: 1000,
    requirement: { type: 'rewards', value: 10000 }
  },
  {
    id: 'rewards_100k',
    name: 'Whale Status',
    description: 'Earn 100,000 TAO in total rewards',
    icon: '🐋',
    category: 'rewards',
    reward: 10000,
    requirement: { type: 'rewards', value: 100000 }
  },

  // Special Achievements
  {
    id: 'jackpot_mini',
    name: 'Lucky Strike',
    description: 'Win a mini jackpot',
    icon: '🎰',
    category: 'special',
    reward: 500,
    requirement: { type: 'jackpot', value: 'mini' }
  },
  {
    id: 'jackpot_mega',
    name: 'Mega Winner',
    description: 'Win a mega jackpot',
    icon: '🎲',
    category: 'special',
    reward: 5000,
    requirement: { type: 'jackpot', value: 'mega' }
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join TaoNet in the first month',
    icon: '🌅',
    category: 'special',
    reward: 2500,
    requirement: { type: 'special', value: 'early' }
  },
  {
    id: 'staker',
    name: 'Validator Supporter',
    description: 'Stake tokens on any subnet',
    icon: '🔒',
    category: 'special',
    reward: 1000,
    requirement: { type: 'stake', value: 1 }
  },

  // Difficulty Achievements
  {
    id: 'expert_task',
    name: 'Expert Territory',
    description: 'Complete an Expert difficulty task',
    icon: '🎯',
    category: 'difficulty',
    reward: 500,
    requirement: { type: 'difficulty', value: 'expert' }
  },
  {
    id: 'master_task',
    name: 'Master Class',
    description: 'Complete a Master difficulty task',
    icon: '🏅',
    category: 'difficulty',
    reward: 2000,
    requirement: { type: 'difficulty', value: 'master' }
  },
  {
    id: 'grandmaster_task',
    name: 'Grandmaster Elite',
    description: 'Complete a Grandmaster difficulty task',
    icon: '🎖️',
    category: 'difficulty',
    reward: 10000,
    requirement: { type: 'difficulty', value: 'grandmaster' }
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🏆' },
  { id: 'mining', name: 'Mining', icon: '⛏️' },
  { id: 'level', name: 'Level', icon: '📈' },
  { id: 'streak', name: 'Streaks', icon: '🔥' },
  { id: 'rewards', name: 'Rewards', icon: '💰' },
  { id: 'difficulty', name: 'Difficulty', icon: '🎯' },
  { id: 'special', name: 'Special', icon: '⭐' }
];

export default function Achievements() {
  const { wallet, miner, isConnected } = useWallet();
  const [activeCategory, setActiveCategory] = useState('all');
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (miner) {
      calculateAchievements();
    } else {
      setLoading(false);
    }
  }, [miner]);

  const calculateAchievements = () => {
    if (!miner) return;
    
    const unlocked = [];
    const stats = miner.stats || {};
    const tasks = stats.completedTasks || 0;
    const rewards = parseInt(stats.totalRewards || '0') / 1e18;
    const level = miner.level || 1;
    const streak = miner.currentStreak || 0;

    ACHIEVEMENTS.forEach(achievement => {
      let isUnlocked = false;
      
      switch (achievement.requirement.type) {
        case 'tasks':
          isUnlocked = tasks >= achievement.requirement.value;
          break;
        case 'level':
          isUnlocked = level >= achievement.requirement.value;
          break;
        case 'streak':
          isUnlocked = streak >= achievement.requirement.value;
          break;
        case 'rewards':
          isUnlocked = rewards >= achievement.requirement.value;
          break;
        case 'special':
          // Check special conditions
          if (achievement.requirement.value === 'early') {
            const joinDate = new Date(miner.createdAt);
            const launchDate = new Date('2025-01-01');
            const oneMonthLater = new Date('2025-02-01');
            isUnlocked = joinDate >= launchDate && joinDate <= oneMonthLater;
          }
          break;
        default:
          isUnlocked = false;
      }

      if (isUnlocked) {
        unlocked.push(achievement.id);
      }
    });

    setUserAchievements(unlocked);
    setLoading(false);
  };

  const getProgress = (achievement) => {
    if (!miner) return 0;
    
    const stats = miner.stats || {};
    const tasks = stats.completedTasks || 0;
    const rewards = parseInt(stats.totalRewards || '0') / 1e18;
    const level = miner.level || 1;
    const streak = miner.currentStreak || 0;

    switch (achievement.requirement.type) {
      case 'tasks':
        return Math.min(100, (tasks / achievement.requirement.value) * 100);
      case 'level':
        return Math.min(100, (level / achievement.requirement.value) * 100);
      case 'streak':
        return Math.min(100, (streak / achievement.requirement.value) * 100);
      case 'rewards':
        return Math.min(100, (rewards / achievement.requirement.value) * 100);
      default:
        return 0;
    }
  };

  const filteredAchievements = activeCategory === 'all' 
    ? ACHIEVEMENTS 
    : ACHIEVEMENTS.filter(a => a.category === activeCategory);

  const unlockedCount = userAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const totalRewardsEarned = ACHIEVEMENTS
    .filter(a => userAchievements.includes(a.id))
    .reduce((sum, a) => sum + a.reward, 0);

  return (
    <div className="page achievements-page">
      <div className="container">
        {/* Header */}
        <div className="achievements-header">
          <h1>Achievements</h1>
          <p>Complete challenges and earn bonus TAO rewards</p>
        </div>

        {/* Stats */}
        <div className="achievements-stats">
          <div className="achievement-stat">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <span className="stat-value">{unlockedCount}/{totalCount}</span>
              <span className="stat-label">Unlocked</span>
            </div>
          </div>
          <div className="achievement-stat">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value">{totalRewardsEarned.toLocaleString()}</span>
              <span className="stat-label">TAO Earned</span>
            </div>
          </div>
          <div className="achievement-stat">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{Math.round((unlockedCount / totalCount) * 100)}%</span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="achievements-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="progress-text">{unlockedCount} of {totalCount} achievements unlocked</span>
        </div>

        {/* Categories */}
        <div className="achievement-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-name">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="achievements-grid">
          {filteredAchievements.map(achievement => {
            const isUnlocked = userAchievements.includes(achievement.id);
            const progress = getProgress(achievement);
            
            return (
              <div 
                key={achievement.id}
                className={`achievement-card ${isUnlocked ? 'unlocked' : ''}`}
              >
                <div className="achievement-icon">
                  {achievement.icon}
                  {isUnlocked && <span className="unlock-badge">✓</span>}
                </div>
                
                <div className="achievement-content">
                  <h3 className="achievement-name">{achievement.name}</h3>
                  <p className="achievement-desc">{achievement.description}</p>
                  
                  {!isUnlocked && progress > 0 && (
                    <div className="achievement-progress">
                      <div className="mini-progress">
                        <div className="mini-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="progress-pct">{Math.round(progress)}%</span>
                    </div>
                  )}
                </div>

                <div className="achievement-reward">
                  <span className="reward-amount">+{achievement.reward.toLocaleString()}</span>
                  <span className="reward-label">TAO</span>
                </div>
              </div>
            );
          })}
        </div>

        {!isConnected && (
          <div className="connect-prompt">
            <p>Connect your wallet to track your achievements</p>
          </div>
        )}
      </div>
    </div>
  );
}