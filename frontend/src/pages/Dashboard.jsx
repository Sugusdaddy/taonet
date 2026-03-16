import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const { wallet, miner, isConnected, refreshMiner } = useWallet();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && wallet) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [wallet, isConnected]);

  async function loadDashboard() {
    setLoading(true);
    const data = await api.getMinerDashboard(wallet);
    if (data) setDashboard(data);
    await refreshMiner();
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </main>
    );
  }

  if (!isConnected) {
    return (
      <main className="dashboard-page">
        <div className="container">
          <div className="empty-state">
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to view your dashboard</p>
          </div>
        </div>
      </main>
    );
  }

  if (!miner) {
    return (
      <main className="dashboard-page">
        <div className="container">
          <div className="empty-state">
            <h2>Not Registered</h2>
            <p>You need to register as a miner first</p>
            <a href="/mine" className="btn btn-primary mt-md">Register Now</a>
          </div>
        </div>
      </main>
    );
  }

  const tierInfo = api.getTierInfo(miner.tokenBalance);
  const xpProgress = miner.xpToNextLevel > 0 
    ? (miner.xp / miner.xpToNextLevel) * 100 
    : 0;

  return (
    <main className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="miner-name">{miner.name}</h1>
            <p className="miner-address">{api.shortAddress(wallet)}</p>
          </div>
          <span className={`badge badge-${tierInfo.tier}`}>{tierInfo.tier}</span>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{miner.stats?.completedTasks || 0}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{api.formatNumber(miner.stats?.totalRewards || 0)}</div>
            <div className="stat-label">Tokens Earned</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{miner.currentStreak || 0}</div>
            <div className="stat-label">Day Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{tierInfo.mult}x</div>
            <div className="stat-label">Multiplier</div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Level Progress */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Level Progress</h3>
              <span className="level-badge">Lv. {miner.level || 1}</span>
            </div>
            <div className="progress-section">
              <div className="progress">
                <div className="progress-bar" style={{ width: `${xpProgress}%` }} />
              </div>
              <div className="progress-info">
                <span>{miner.xp || 0} XP</span>
                <span>{miner.xpToNextLevel || 100} XP needed</span>
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tier Status</h3>
              <span className={`badge badge-${tierInfo.tier}`}>{tierInfo.tier}</span>
            </div>
            <div className="tier-info">
              <div className="tier-current">
                <span className="tier-mult-large">{tierInfo.mult}x</span>
                <span className="tier-label">Current Multiplier</span>
              </div>
              {tierInfo.next && (
                <div className="tier-next">
                  <p>Next tier: <strong>{tierInfo.next.tier}</strong></p>
                  <p className="text-tertiary">Need {api.formatNumber(tierInfo.next.need)} tokens</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card span-2">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            {dashboard?.recentTasks?.length > 0 ? (
              <div className="activity-list">
                {dashboard.recentTasks.map((task, i) => (
                  <div key={i} className="activity-row">
                    <div className="activity-info">
                      <span className="activity-type">{task.type}</span>
                      <span className="activity-id">{task.id?.substring(0, 8)}...</span>
                    </div>
                    <div className="activity-meta">
                      <span className={`activity-status status-${task.status}`}>{task.status}</span>
                      <span className="activity-time">{api.timeAgo(task.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-tertiary">No recent activity. Start mining!</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
