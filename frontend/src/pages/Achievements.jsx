import { useState, useEffect } from 'react';
import api from '../api';
import { useWallet } from '../context/WalletContext';
import './Achievements.css';

export default function Achievements() {
  const { miner, isConnected } = useWallet();
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    const data = await api.getAchievements();
    if (data?.achievements) setAchievements(data.achievements);
  }

  const categories = [
    'onboarding', 'tasks', 'streaks', 'quality', 'speed', 
    'jackpot', 'referral', 'staking', 'special', 'level'
  ];

  const userAchievements = miner?.achievements || [];

  return (
    <main className="achievements-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Achievements</h1>
          <p className="page-subtitle">Unlock badges and earn bonus XP</p>
        </div>

        {/* Progress */}
        <div className="achievement-progress">
          <div className="progress-stat">
            <span className="progress-value">{userAchievements.length}</span>
            <span className="progress-label">Unlocked</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress">
              <div 
                className="progress-bar" 
                style={{ width: `${(userAchievements.length / 30) * 100}%` }}
              />
            </div>
          </div>
          <div className="progress-stat">
            <span className="progress-value">30</span>
            <span className="progress-label">Total</span>
          </div>
        </div>

        {/* Categories */}
        {categories.map(category => {
          const categoryAchievements = achievements.filter(a => a.category === category);
          if (categoryAchievements.length === 0) return null;

          return (
            <div key={category} className="achievement-category">
              <h3 className="category-title">{category}</h3>
              <div className="achievements-grid">
                {categoryAchievements.map((a, i) => {
                  const unlocked = userAchievements.includes(a.id);
                  return (
                    <div key={i} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                      <div className="achievement-icon">{a.icon || '?'}</div>
                      <div className="achievement-info">
                        <h4 className="achievement-name">{a.name}</h4>
                        <p className="achievement-desc">{a.description}</p>
                        <span className="achievement-xp">+{a.xp} XP</span>
                      </div>
                      {unlocked && <span className="unlocked-badge">Unlocked</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {achievements.length === 0 && (
          <div className="empty-state">
            <p>Loading achievements...</p>
          </div>
        )}
      </div>
    </main>
  );
}
