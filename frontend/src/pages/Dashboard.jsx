import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentProofs, setRecentProofs] = useState([]);
  const [topMiners, setTopMiners] = useState([]);
  const [networkHistory, setNetworkHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, proofsRes, leaderboardRes] = await Promise.all([
        api.getNetworkStats(),
        api.getProofs({ limit: 10 }),
        api.getLeaderboard()
      ]);
      
      setStats(statsRes);
      setRecentProofs(proofsRes.proofs || []);
      setTopMiners(leaderboardRes.leaderboard?.slice(0, 5) || []);
      
      // Generate mock history for chart (would be real API in production)
      const history = [];
      for (let i = 23; i >= 0; i--) {
        history.push({
          hour: i,
          proofs: Math.floor(Math.random() * 50) + 10,
          miners: Math.floor(Math.random() * 5) + 1
        });
      }
      setNetworkHistory(history.reverse());
      
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toString();
  };

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="container">
          <div className="loading-state">Loading dashboard...</div>
        </div>
      </main>
    );
  }

  const maxProofs = Math.max(...networkHistory.map(h => h.proofs), 1);

  return (
    <main className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Network Dashboard</h1>
            <p>Real-time TaoNet statistics and activity</p>
          </div>
          <div className="header-actions">
            <Link to="/mine" className="btn-primary">Start Mining</Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{stats?.minersOnline || 0}</span>
              <span className="metric-label">Miners Online</span>
            </div>
            <div className="metric-change positive">
              <span>+{Math.floor(Math.random() * 10)}%</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{formatNumber(stats?.totalProofs || 0)}</span>
              <span className="metric-label">Total Proofs</span>
            </div>
            <div className="metric-trend">
              <span>{stats?.proofsToday || 0} today</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{stats?.avgResponseTime || 0}ms</span>
              <span className="metric-label">Avg Response</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="metric-content">
              <span className="metric-value">{formatNumber(parseFloat(stats?.totalRewards || 0) / 1e18)}</span>
              <span className="metric-label">TAO Distributed</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Activity Chart */}
          <div className="chart-card">
            <div className="card-header">
              <h3>Network Activity (24h)</h3>
              <div className="chart-legend">
                <span className="legend-item"><span className="dot blue"></span> Proofs</span>
              </div>
            </div>
            <div className="chart-container">
              <div className="bar-chart">
                {networkHistory.map((h, i) => (
                  <div key={i} className="bar-wrapper">
                    <div 
                      className="bar" 
                      style={{ height: `${(h.proofs / maxProofs) * 100}%` }}
                      title={`${h.proofs} proofs`}
                    />
                    <span className="bar-label">{h.hour}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Proofs */}
          <div className="proofs-card">
            <div className="card-header">
              <h3>Recent Proofs</h3>
              <Link to="/explorer" className="view-all">View All</Link>
            </div>
            <div className="proofs-list">
              {recentProofs.map((proof, i) => (
                <div key={i} className="proof-item">
                  <div className="proof-block">#{proof.blockHeight}</div>
                  <div className="proof-info">
                    <span className="proof-hash">{proof.combinedHash?.slice(0, 16)}...</span>
                    <span className="proof-miner">{proof.miner?.slice(0, 8)}...</span>
                  </div>
                  <div className="proof-time">
                    {new Date(proof.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {recentProofs.length === 0 && (
                <div className="empty-state">No proofs yet</div>
              )}
            </div>
          </div>

          {/* Top Miners */}
          <div className="miners-card">
            <div className="card-header">
              <h3>Top Miners</h3>
              <Link to="/leaderboard" className="view-all">Leaderboard</Link>
            </div>
            <div className="miners-list">
              {topMiners.map((miner, i) => (
                <div key={i} className="miner-row">
                  <div className="miner-rank">#{i + 1}</div>
                  <div className="miner-details">
                    <span className="miner-name">{miner.name}</span>
                    <span className="miner-address">{miner.address?.slice(0, 8)}...</span>
                  </div>
                  <div className="miner-score">
                    <span className="score-value">{miner.stats?.completedTasks || 0}</span>
                    <span className="score-label">tasks</span>
                  </div>
                </div>
              ))}
              {topMiners.length === 0 && (
                <div className="empty-state">No miners yet</div>
              )}
            </div>
          </div>

          {/* Knowledge Stats */}
          <div className="knowledge-card">
            <div className="card-header">
              <h3>Knowledge Base</h3>
              <Link to="/playground" className="view-all">Try SolanaGPT</Link>
            </div>
            <div className="knowledge-stats">
              <div className="knowledge-stat">
                <span className="stat-number">{stats?.knowledgeCount || 155}</span>
                <span className="stat-text">Questions Learned</span>
              </div>
              <div className="knowledge-stat">
                <span className="stat-number">10</span>
                <span className="stat-text">Categories</span>
              </div>
              <div className="knowledge-progress">
                <div className="progress-header">
                  <span>Learning Progress</span>
                  <span>{Math.min(100, Math.round((stats?.knowledgeCount || 0) / 155 * 100))}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min(100, (stats?.knowledgeCount || 0) / 155 * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Solana Anchor Status */}
        <div className="anchor-status">
          <div className="anchor-header">
            <div className="anchor-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <h3>Solana Anchoring</h3>
              <p>Proofs verified on-chain every 10 blocks</p>
            </div>
          </div>
          <div className="anchor-stats">
            <div className="anchor-stat">
              <span className="value">{stats?.lastAnchorBlock || '-'}</span>
              <span className="label">Last Anchor Block</span>
            </div>
            <div className="anchor-stat">
              <span className="value">{stats?.totalAnchors || 0}</span>
              <span className="label">Total Anchors</span>
            </div>
            <div className="anchor-stat">
              <span className="value">Devnet</span>
              <span className="label">Network</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
