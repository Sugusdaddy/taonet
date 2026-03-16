import { useState, useEffect } from 'react';
import api from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [miners, setMiners] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalRewards');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [sortBy]);

  async function loadData() {
    const [leaderboard, statsData] = await Promise.all([
      api.getLeaderboard(sortBy, 50),
      api.getStats()
    ]);
    if (leaderboard?.leaderboard) setMiners(leaderboard.leaderboard);
    if (statsData) setStats(statsData);
    setLoading(false);
  }

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge gold">1</span>;
    if (rank === 2) return <span className="rank-badge silver">2</span>;
    if (rank === 3) return <span className="rank-badge bronze">3</span>;
    return <span className="rank-num">{rank}</span>;
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#9ca3af',
      gold: '#fbbf24',
      platinum: '#e5e7eb',
      diamond: '#60a5fa'
    };
    return colors[tier] || colors.bronze;
  };

  return (
    <div className="page leaderboard-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Leaderboard</h1>
            <p>Top miners by performance</p>
          </div>
          <div className="live-indicator">
            <span className="status-dot online"></span>
            Live
          </div>
        </div>

        {/* Mini Stats */}
        <div className="mini-stats">
          <div className="mini-stat">
            <span className="value">{stats?.network?.totalMiners || miners.length}</span>
            <span className="label">Total Miners</span>
          </div>
          <div className="mini-stat">
            <span className="value online">{stats?.network?.onlineMiners || 0}</span>
            <span className="label">Online Now</span>
          </div>
          <div className="mini-stat">
            <span className="value">{stats?.tasks?.completed || 0}</span>
            <span className="label">Total Tasks</span>
          </div>
          <div className="mini-stat">
            <span className="value">{api.formatNumber(stats?.rewards?.totalDistributed || 0)}</span>
            <span className="label">TAO Distributed</span>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="sort-tabs">
          <button 
            className={`tab ${sortBy === 'totalRewards' ? 'active' : ''}`}
            onClick={() => setSortBy('totalRewards')}
          >
            Rewards
          </button>
          <button 
            className={`tab ${sortBy === 'completedTasks' ? 'active' : ''}`}
            onClick={() => setSortBy('completedTasks')}
          >
            Tasks
          </button>
          <button 
            className={`tab ${sortBy === 'level' ? 'active' : ''}`}
            onClick={() => setSortBy('level')}
          >
            Level
          </button>
          <button 
            className={`tab ${sortBy === 'reputation' ? 'active' : ''}`}
            onClick={() => setSortBy('reputation')}
          >
            Reputation
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : miners.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <h3>No miners yet</h3>
            <p>Be the first to join the network</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Miner</th>
                  <th>Level</th>
                  <th>Tasks</th>
                  <th>Rewards</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {miners.map((miner, i) => (
                  <tr key={miner._id} className={i < 3 ? 'top-rank' : ''}>
                    <td>{getRankBadge(i + 1)}</td>
                    <td>
                      <div className="miner-cell">
                        <div 
                          className="miner-avatar"
                          style={{ borderColor: getTierColor(miner.tier) }}
                        >
                          {(miner.name || miner.address)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="miner-info">
                          <span className="miner-name">{miner.name || 'Anonymous'}</span>
                          <span className="miner-address">{api.shortAddress(miner.address)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="level-cell">
                        <span className="level-badge">Lv. {miner.level || 1}</span>
                        <span className="xp-text">{miner.xp || 0} XP</span>
                      </div>
                    </td>
                    <td>
                      <div className="tasks-cell">
                        <span className="task-count">{miner.stats?.completedTasks || 0}</span>
                        <span className="success-rate">
                          {miner.stats?.successRate ? `${(miner.stats.successRate * 100).toFixed(0)}%` : '100%'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="rewards-amount">
                        {api.formatNumber(miner.stats?.totalRewards || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${miner.status || 'offline'}`}>
                        <span className="status-dot"></span>
                        {miner.status || 'offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
