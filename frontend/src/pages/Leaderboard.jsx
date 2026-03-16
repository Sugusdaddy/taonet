import { useState, useEffect } from 'react';
import api from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [miners, setMiners] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('composite');
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [sortBy, timeframe]);

  async function loadData() {
    const [minersData, statsData] = await Promise.all([
      api.get(`/api/miners/leaderboard?sortBy=${sortBy}&limit=50&timeframe=${timeframe}`),
      api.get('/api/stats')
    ]);
    if (minersData?.leaderboard) setMiners(minersData.leaderboard);
    else if (Array.isArray(minersData)) setMiners(minersData);
    if (statsData) setStats(statsData);
    setLoading(false);
  }

  const getTierColor = (tier) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
      diamond: '#b9f2ff'
    };
    return colors[tier] || 'var(--text-4)';
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '1st', class: 'gold' };
    if (rank === 2) return { emoji: '2nd', class: 'silver' };
    if (rank === 3) return { emoji: '3rd', class: 'bronze' };
    return null;
  };

  const getScoreBarWidth = (score, maxScore = 100) => {
    return Math.min((parseFloat(score) / maxScore) * 100, 100);
  };

  return (
    <main className="leaderboard-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Leaderboard</h1>
            <p>Top miners ranked by performance</p>
          </div>
          <div className="live-badge">
            <span className="live-dot"></span>
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="mini-stat">
            <span className="mini-value">{stats?.network?.totalMiners || 0}</span>
            <span className="mini-label">Total Miners</span>
          </div>
          <div className="mini-stat">
            <span className="mini-value online">{stats?.network?.onlineMiners || 0}</span>
            <span className="mini-label">Online Now</span>
          </div>
          <div className="mini-stat">
            <span className="mini-value">{stats?.tasks?.completed || 0}</span>
            <span className="mini-label">Tasks Done</span>
          </div>
          <div className="mini-stat">
            <span className="mini-value">{api.formatNumber(stats?.rewards?.totalDistributed || 0)}</span>
            <span className="mini-label">TAO Distributed</span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-row">
          {/* Sort Tabs */}
          <div className="sort-tabs">
            <button 
              className={`tab ${sortBy === 'composite' ? 'active' : ''}`}
              onClick={() => setSortBy('composite')}
            >
              Score
            </button>
            <button 
              className={`tab ${sortBy === 'rewards' ? 'active' : ''}`}
              onClick={() => setSortBy('rewards')}
            >
              Rewards
            </button>
            <button 
              className={`tab ${sortBy === 'tasks' ? 'active' : ''}`}
              onClick={() => setSortBy('tasks')}
            >
              Tasks
            </button>
            <button 
              className={`tab ${sortBy === 'efficiency' ? 'active' : ''}`}
              onClick={() => setSortBy('efficiency')}
            >
              Efficiency
            </button>
            <button 
              className={`tab ${sortBy === 'level' ? 'active' : ''}`}
              onClick={() => setSortBy('level')}
            >
              Level
            </button>
            <button 
              className={`tab ${sortBy === 'streak' ? 'active' : ''}`}
              onClick={() => setSortBy('streak')}
            >
              Streak
            </button>
          </div>

          {/* Timeframe Tabs */}
          <div className="timeframe-tabs">
            <button 
              className={`tab-small ${timeframe === 'day' ? 'active' : ''}`}
              onClick={() => setTimeframe('day')}
            >
              24h
            </button>
            <button 
              className={`tab-small ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => setTimeframe('week')}
            >
              7d
            </button>
            <button 
              className={`tab-small ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => setTimeframe('month')}
            >
              30d
            </button>
            <button 
              className={`tab-small ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => setTimeframe('all')}
            >
              All
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="leaderboard-card">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading leaderboard...</p>
            </div>
          ) : miners.length === 0 ? (
            <div className="empty-state">
              <h3>No miners yet</h3>
              <p>Be the first to start mining and claim the top spot!</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Miner</th>
                  <th>Level</th>
                  <th>Score</th>
                  <th>Tasks</th>
                  <th>Rewards</th>
                  <th>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {miners.map((miner) => {
                  const badge = getRankBadge(miner.rank);
                  return (
                    <tr key={miner.address} className={miner.rank <= 3 ? 'top-rank' : ''}>
                      <td>
                        {badge ? (
                          <span className={`rank-badge ${badge.class}`}>{badge.emoji}</span>
                        ) : (
                          <span className="rank-number">{miner.rank}</span>
                        )}
                      </td>
                      <td>
                        <div className="miner-cell">
                          <div 
                            className="miner-avatar"
                            style={{ borderColor: getTierColor(miner.stakingTier) }}
                          >
                            {(miner.name || 'M')[0].toUpperCase()}
                          </div>
                          <div className="miner-info">
                            <span className="miner-name">{miner.name || 'Anonymous'}</span>
                            <div className="miner-meta">
                              <span className="miner-address">{api.shortAddress(miner.address)}</span>
                              <span 
                                className="tier-dot"
                                style={{ background: getTierColor(miner.stakingTier) }}
                                title={miner.stakingTier}
                              ></span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="level-cell">
                          <span className="level-badge">Lv.{miner.level}</span>
                          <span className="xp-text">{miner.xp} XP</span>
                        </div>
                      </td>
                      <td>
                        <div className="score-cell">
                          <span className="score-value">{miner.scores?.composite || '0'}</span>
                          <div className="score-bar">
                            <div 
                              className="score-fill"
                              style={{ width: `${getScoreBarWidth(miner.scores?.composite || 0, 150)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="tasks-cell">
                          <span className="task-count">{miner.stats?.completedTasks || 0}</span>
                          <span className="success-rate">{miner.stats?.successRate || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="rewards-amount">
                          {api.formatNumber(miner.stats?.totalRewards || 0)}
                        </span>
                      </td>
                      <td>
                        <span className={`multiplier-badge ${parseFloat(miner.totalMultiplier) > 1.5 ? 'high' : ''}`}>
                          {miner.totalMultiplier}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="legend-card">
          <h4>Scoring Formula</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-pct">40%</span>
              <span>Rewards</span>
            </div>
            <div className="legend-item">
              <span className="legend-pct">25%</span>
              <span>Tasks</span>
            </div>
            <div className="legend-item">
              <span className="legend-pct">20%</span>
              <span>Reputation</span>
            </div>
            <div className="legend-item">
              <span className="legend-pct">10%</span>
              <span>Level</span>
            </div>
            <div className="legend-item">
              <span className="legend-pct">5%</span>
              <span>Streak</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
