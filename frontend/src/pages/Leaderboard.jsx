import { useState, useEffect } from 'react';
import api from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [miners, setMiners] = useState([]);
  const [sort, setSort] = useState('totalRewards');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [sort]);

  async function loadLeaderboard() {
    setLoading(true);
    const data = await api.getLeaderboard(sort, 50);
    if (data?.leaderboard) setMiners(data.leaderboard);
    setLoading(false);
  }

  const sortOptions = [
    { value: 'totalRewards', label: 'Total Rewards' },
    { value: 'tasks', label: 'Tasks Completed' },
    { value: 'streak', label: 'Longest Streak' },
  ];

  return (
    <main className="leaderboard-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Top miners on the network</p>
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
                    <th>Rank</th>
                    <th>Miner</th>
                    <th>Tier</th>
                    <th>Level</th>
                    <th>{sort === 'totalRewards' ? 'Rewards' : sort === 'tasks' ? 'Tasks' : 'Streak'}</th>
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
                        <span className={`badge badge-${miner.stakingTier || 'bronze'}`}>
                          {miner.stakingTier || 'bronze'}
                        </span>
                      </td>
                      <td>
                        <span className="level">Lv. {miner.level || 1}</span>
                      </td>
                      <td className="stat-col">
                        {sort === 'totalRewards' && api.formatNumber(miner.stats?.totalRewards || 0)}
                        {sort === 'tasks' && (miner.stats?.completedTasks || 0)}
                        {sort === 'streak' && `${miner.currentStreak || 0} days`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <p>No miners yet. Be the first to join!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
