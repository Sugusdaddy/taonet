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
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [sortBy, timeframe]);

  async function loadData() {
    try {
      const [leaderboard, statsData] = await Promise.all([
        api.getLeaderboard(sortBy, 100, timeframe),
        api.getStats()
      ]);
      if (leaderboard?.leaderboard) setMiners(leaderboard.leaderboard);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Leaderboard load error:', err);
    }
    setLoading(false);
  }

  const formatRewards = (wei) => {
    if (!wei) return '0';
    try {
      const tokens = Number(BigInt(wei)) / 1e18;
      if (tokens >= 1000000) return (tokens / 1000000).toFixed(2) + 'M';
      if (tokens >= 1000) return (tokens / 1000).toFixed(2) + 'K';
      return tokens.toFixed(2);
    } catch {
      return '0';
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge gold">1</span>;
    if (rank === 2) return <span className="rank-badge silver">2</span>;
    if (rank === 3) return <span className="rank-badge bronze">3</span>;
    return <span className="rank-num">{rank}</span>;
  };

  const getTierColor = (tier) => {
    const colors = {
      none: '#6b7280',
      bronze: '#cd7f32',
      silver: '#9ca3af',
      gold: '#fbbf24',
      platinum: '#e5e7eb',
      diamond: '#60a5fa'
    };
    return colors[tier] || colors.bronze;
  };

  // Calculate totals from miners
  const totalTasks = miners.reduce((sum, m) => sum + (m.stats?.completedTasks || 0), 0);
  const totalRewardsWei = miners.reduce((sum, m) => {
    try { return sum + BigInt(m.stats?.totalRewards || '0'); }
    catch { return sum; }
  }, BigInt(0));

  return (
    <div className="page leaderboard-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Leaderboard</h1>
            <p>Top miners competing for rewards on TaoNet</p>
          </div>
          <div className="live-indicator">
            <span className="status-dot online"></span>
            Live
          </div>
        </div>

        {/* Mini Stats - All 4 working */}
        <div className="mini-stats">
          <div className="mini-stat">
            <span className="value">{stats?.network?.totalMiners || miners.length}</span>
            <span className="label">Total Miners</span>
          </div>
          <div className="mini-stat">
            <span className="value highlight">{stats?.network?.onlineMiners || 0}</span>
            <span className="label">Online Now</span>
          </div>
          <div className="mini-stat">
            <span className="value">{(stats?.tasks?.completed || totalTasks).toLocaleString()}</span>
            <span className="label">Tasks Completed</span>
          </div>
          <div className="mini-stat">
            <span className="value">{formatRewards(stats?.rewards?.totalDistributed || totalRewardsWei.toString())}</span>
            <span className="label">TAO Distributed</span>
          </div>
        </div>

        {/* Filters */}
        <div className="leaderboard-filters">
          <div className="sort-tabs">
            <button 
              className={`tab ${sortBy === 'composite' ? 'active' : ''}`}
              onClick={() => setSortBy('composite')}
            >
              Overall
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
          </div>
          <div className="timeframe-tabs">
            <button 
              className={`tab-sm ${timeframe === 'day' ? 'active' : ''}`}
              onClick={() => setTimeframe('day')}
            >
              24h
            </button>
            <button 
              className={`tab-sm ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => setTimeframe('week')}
            >
              7d
            </button>
            <button 
              className={`tab-sm ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => setTimeframe('month')}
            >
              30d
            </button>
            <button 
              className={`tab-sm ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => setTimeframe('all')}
            >
              All
            </button>
          </div>
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
            <p>Be the first to join the network and start mining</p>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Miner</th>
                    <th>Level</th>
                    <th>Tasks</th>
                    <th>Rewards</th>
                    <th>Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.map((miner, i) => (
                    <tr key={miner.address || i} className={i < 3 ? 'top-rank' : ''}>
                      <td>{getRankBadge(miner.rank || i + 1)}</td>
                      <td>
                        <div className="miner-cell">
                          <div 
                            className="miner-avatar"
                            style={{ borderColor: getTierColor(miner.stakingTier) }}
                          >
                            {(miner.name || miner.address)?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="miner-info">
                            <span className="miner-name">{miner.name || 'Anonymous'}</span>
                            <span className="miner-address">
                              {miner.address?.slice(0, 6)}...{miner.address?.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="level-cell">
                          <span className="level-badge">Lv.{miner.level || 1}</span>
                          <span className="xp-text">{(miner.xp || 0).toLocaleString()} XP</span>
                        </div>
                      </td>
                      <td>
                        <div className="tasks-cell">
                          <span className="task-count">{(miner.stats?.completedTasks || 0).toLocaleString()}</span>
                          <span className="multiplier">x{miner.totalMultiplier || '1.00'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="rewards-amount">
                          {formatRewards(miner.stats?.totalRewards)} TAO
                        </span>
                      </td>
                      <td>
                        <span className="score-badge">{miner.scores?.composite || '0'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${miner.status || 'offline'}`}>
                          {miner.status || 'offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="leaderboard-legend">
          <div className="legend-section">
            <h4>Staking Tiers</h4>
            <div className="legend-items">
              <span className="legend-item"><span className="tier-dot" style={{background: '#cd7f32'}}></span> Bronze</span>
              <span className="legend-item"><span className="tier-dot" style={{background: '#9ca3af'}}></span> Silver</span>
              <span className="legend-item"><span className="tier-dot" style={{background: '#fbbf24'}}></span> Gold</span>
              <span className="legend-item"><span className="tier-dot" style={{background: '#e5e7eb'}}></span> Platinum</span>
              <span className="legend-item"><span className="tier-dot" style={{background: '#60a5fa'}}></span> Diamond</span>
            </div>
          </div>
          <div className="legend-section">
            <h4>Score Calculation</h4>
            <p>Composite score = log(rewards) + log(tasks) + reputation + level + streak bonuses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
