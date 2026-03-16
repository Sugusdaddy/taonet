import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const { wallet, miner, isConnected } = useWallet();
  const [stats, setStats] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [recentProofs, setRecentProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      loadData();
      const interval = setInterval(loadData, 15000);
      return () => clearInterval(interval);
    }
  }, [wallet]);

  async function loadData() {
    const [minerData, network, proofs] = await Promise.all([
      api.getMinerDashboard(wallet),
      api.getStats(),
      api.getProofs({ miner: wallet, limit: 5 })
    ]);
    if (minerData) setStats(minerData);
    if (network) setNetworkStats(network);
    if (proofs?.proofs) setRecentProofs(proofs.proofs);
    setLoading(false);
  }

  if (!isConnected) {
    return (
      <div className="page dashboard-page">
        <div className="container">
          <div className="connect-prompt">
            <h2>Connect your wallet</h2>
            <p>View your mining stats and history</p>
            <Link to="/mine" className="btn btn-primary">Go to Mine</Link>
          </div>
        </div>
      </div>
    );
  }

  const tierColors = {
    bronze: '#cd7f32',
    silver: '#9ca3af',
    gold: '#fbbf24',
    platinum: '#e5e7eb',
    diamond: '#60a5fa'
  };

  const tierInfo = api.getTierInfo(miner?.balance || 0);

  return (
    <div className="page dashboard-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Your mining performance overview</p>
          </div>
          <Link to="/mine" className="btn btn-primary">
            Start Mining
          </Link>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Miner Info */}
            <div className="miner-card">
              <div className="miner-header">
                <div className="miner-avatar" style={{ borderColor: tierColors[tierInfo.tier] }}>
                  {(miner?.name || wallet)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="miner-details">
                  <h2>{miner?.name || 'Anonymous'}</h2>
                  <span className="wallet-addr">{api.shortAddress(wallet)}</span>
                </div>
                <div className="miner-badges">
                  <span className="level-badge">Level {miner?.level || 1}</span>
                  <span className="tier-badge" style={{ color: tierColors[tierInfo.tier] }}>
                    {tierInfo.tier.charAt(0).toUpperCase() + tierInfo.tier.slice(1)}
                  </span>
                </div>
              </div>

              <div className="xp-progress">
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${((miner?.xp || 0) % 1000) / 10}%` }}></div>
                </div>
                <span className="xp-text">{miner?.xp || 0} XP</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{miner?.stats?.completedTasks || 0}</span>
                <span className="stat-label">Tasks Completed</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{api.formatNumber(miner?.stats?.totalRewards || 0)}</span>
                <span className="stat-label">TAO Earned</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{miner?.stats?.currentStreak || 0}</span>
                <span className="stat-label">Day Streak</span>
              </div>

              <div className="stat-card">
                <span className="stat-value">{tierInfo.mult}x</span>
                <span className="stat-label">Multiplier</span>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h3>Recent Proofs</h3>
                  <Link to="/explorer" className="view-all">View all</Link>
                </div>
                <div className="card-body">
                  {recentProofs.length > 0 ? (
                    <div className="proofs-list">
                      {recentProofs.map((proof) => (
                        <div key={proof._id} className="proof-row">
                          <span className="proof-num">#{proof.blockNumber}</span>
                          <span className="proof-hash">{proof.blockHash?.slice(0, 12)}...</span>
                          <span className="proof-time">{api.timeAgo(proof.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <p>No proofs yet. Start mining to generate proofs.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Network Status</h3>
                </div>
                <div className="card-body">
                  <div className="network-stats">
                    <div className="network-stat">
                      <span className="label">Miners Online</span>
                      <span className="value online">{networkStats?.network?.onlineMiners || 0}</span>
                    </div>
                    <div className="network-stat">
                      <span className="label">Total Tasks</span>
                      <span className="value">{networkStats?.tasks?.completed || 0}</span>
                    </div>
                    <div className="network-stat">
                      <span className="label">Chain Height</span>
                      <span className="value">{networkStats?.chain?.height || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
