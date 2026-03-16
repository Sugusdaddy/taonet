import { useState, useEffect } from 'react';
import api from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [miners, setMiners] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rewards');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [sortBy]);

  async function loadData() {
    const [minersData, statsData] = await Promise.all([
      api.get(`/miners/leaderboard?sortBy=${sortBy}&limit=50`),
      api.get('/stats')
    ]);
    if (minersData) setMiners(minersData);
    if (statsData) setStats(statsData);
    setLoading(false);
  }

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'var(--bronze)',
      silver: 'var(--silver)',
      gold: 'var(--gold)',
      platinum: 'var(--platinum)',
      diamond: 'var(--diamond)'
    };
    return colors[tier] || 'var(--text-4)';
  };

  const getRankBadge = (index) => {
    if (index === 0) return { emoji: '1st', class: 'gold' };
    if (index === 1) return { emoji: '2nd', class: 'silver' };
    if (index === 2) return { emoji: '3rd', class: 'bronze' };
    return null;
  };

  return (
    <main className="leaderboard-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Leaderboard</h1>
            <p>Top miners on the network</p>
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

        {/* Sort Tabs */}
        <div className="sort-tabs">
          <button 
            className={`tab ${sortBy === 'rewards' ? 'active' : ''}`}
            onClick={() => setSortBy('rewards')}
          >
            By Rewards
          </button>
          <button 
            className={`tab ${sortBy === 'tasks' ? 'active' : ''}`}
            onClick={() => setSortBy('tasks')}
          >
            By Tasks
          </button>
          <button 
            className={`tab ${sortBy === 'streak' ? 'active' : ''}`}
            onClick={() => setSortBy('streak')}
          >
            By Streak
          </button>
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
                  <th>Tier</th>
                  <th>Tasks</th>
                  <th>Rewards</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {miners.map((miner, index) => {
                  const badge = getRankBadge(index);
                  return (
                    <tr key={miner._id || miner.address}>
                      <td>
                        {badge ? (
                          <span className={`rank-badge ${badge.class}`}>{badge.emoji}</span>
                        ) : (
                          <span className="rank-number">{index + 1}</span>
                        )}
                      </td>
                      <td>
                        <div className="miner-cell">
                          <div className="miner-avatar">
                            {(miner.name || 'M')[0].toUpperCase()}
                          </div>
                          <div className="miner-info">
                            <span className="miner-name">{miner.name || 'Anonymous'}</span>
                            <span className="miner-address">{api.shortAddress(miner.address)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="tier-badge"
                          style={{ color: getTierColor(miner.tier), borderColor: getTierColor(miner.tier) }}
                        >
                          {miner.tier || 'bronze'}
                        </span>
                      </td>
                      <td>
                        <span className="task-count">{miner.stats?.completedTasks || 0}</span>
                      </td>
                      <td>
                        <span className="rewards-amount">
                          {api.formatNumber(miner.stats?.totalRewards || 0)} TAO
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${miner.status || 'offline'}`}>
                          <span className="status-dot"></span>
                          {miner.status || 'offline'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
