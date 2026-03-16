import { useState, useEffect } from 'react';
import api from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [miners, setMiners] = useState([]);
  const [sort, setSort] = useState('totalRewards');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadLeaderboard();
    // Auto-refresh every 5 seconds for live data
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [sort]);

  async function loadLeaderboard() {
    const data = await api.getLeaderboard(sort, 50);
    if (data?.leaderboard) {
      setMiners(data.leaderboard);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }

  const sortOptions = [
    { value: 'totalRewards', label: 'Total Rewards' },
    { value: 'tasks', label: 'Tasks Completed' },
    { value: 'reputation', label: 'Reputation' },
  ];

  const getStatValue = (miner) => {
    switch (sort) {
      case 'totalRewards':
        return api.formatNumber(miner.stats?.totalRewards || 0);
      case 'tasks':
        return miner.stats?.completedTasks || 0;
      case 'reputation':
        return miner.reputation || 50;
      default:
        return '-';
    }
  };

  return (
    <main className="leaderboard-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Leaderboard</h1>
            <p className="page-subtitle">Live network rankings - updates every 5s</p>
          </div>
          {lastUpdate && (
            <span className="live-indicator">
              <span className="live-dot"></span>
              LIVE
            </span>
          )}
        </div>

        {/* Stats Summary */}
        <div className="leaderboard-stats">
          <div className="lb-stat">
            <span className="lb-stat-value">{miners.length}</span>
            <span className="lb-stat-label">Total Miners</span>
          </div>
          <div className="lb-stat">
            <span className="lb-stat-value">{miners.filter(m => m.status === 'online').length}</span>
            <span className="lb-stat-label">Online Now</span>
          </div>
          <div className="lb-stat">
            <span className="lb-stat-value">
              {miners.reduce((sum, m) => sum + (m.stats?.completedTasks || 0), 0)}
            </span>
            <span className="lb-stat-label">Total Tasks</span>
          </div>
          <div className="lb-stat">
            <span className="lb-stat-value">
              {api.formatNumber(miners.reduce((sum, m) => sum + Number(m.stats?.totalRewards || 0), 0))}
            </span>
            <span className="lb-stat-label">Total Rewards</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              className={`tab ${sort === opt.value ? 'active' : ''}`}
              onClick={() => setSort(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : miners.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Miner</th>
                    <th>Status</th>
                    <th>Tasks</th>
                    <th>Reputation</th>
                    <th>{sort === 'totalRewards' ? 'Rewards' : sort === 'tasks' ? 'Tasks' : 'Rep'}</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.map((miner, i) => (
                    <tr key={miner.address} className={i < 3 ? `rank-${i + 1}` : ''}>
                      <td>
                        <span className={`rank ${i < 3 ? `top-${i + 1}` : ''}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <div className="miner-cell">
                          <span className="miner-name">{miner.name || 'Anonymous'}</span>
                          <span className="miner-address">{api.shortAddress(miner.address)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${miner.status || 'offline'}`}>
                          {miner.status || 'offline'}
                        </span>
                      </td>
                      <td>{miner.stats?.completedTasks || 0}</td>
                      <td>
                        <div className="rep-bar">
                          <div className="rep-fill" style={{ width: `${miner.reputation || 50}%` }}></div>
                          <span className="rep-value">{miner.reputation || 50}</span>
                        </div>
                      </td>
                      <td className="stat-col highlight">
                        {getStatValue(miner)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <p>No miners yet</p>
              <p className="text-sm">Be the first to join the network!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
