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
            <div className="prompt-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
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
                <div className="stat-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <path d="M22 4L12 14.01l-3-3"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-value">{miner?.stats?.completedTasks || 0}</span>
                  <span className="stat-label">Tasks Completed</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-value">{api.formatNumber(miner?.stats?.totalRewards || 0)}</span>
                  <span className="stat-label">TAO Earned</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-value">{miner?.stats?.currentStreak || 0}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10M18 20V4M6 20v-4"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-value">{tierInfo.mult}x</span>
                  <span className="stat-label">Multiplier</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h3>Recent Proofs</h3>
                  <Link to="/explorer" className="view-all">View all</Link>
                </div>
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

              <div className="card">
                <div className="card-header">
                  <h3>Network Status</h3>
                </div>
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
          </>
        )}
      </div>
    </div>
  );
}
