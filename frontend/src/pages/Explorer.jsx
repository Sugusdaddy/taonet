import { useState, useEffect } from 'react';
import api from '../api';
import './Explorer.css';

export default function Explorer() {
  const [activeTab, setActiveTab] = useState('proofs');
  const [proofs, setProofs] = useState([]);
  const [airdrops, setAirdrops] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [proofsRes, statsRes, airdropsRes] = await Promise.all([
        api.getProofs({ limit: 50 }),
        api.get('/api/proofs/stats'),
        fetch('https://api.taonet.fun/api/airdrops/recent?limit=50').then(r => r.json())
      ]);
      if (proofsRes?.proofs) setProofs(proofsRes.proofs);
      if (statsRes) setStats(statsRes);
      if (airdropsRes?.airdrops) setAirdrops(airdropsRes.airdrops);
    } catch (err) {
      console.error('Explorer load error:', err);
    }
    setLoading(false);
  }

  const formatNumber = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const formatTAO = (amount) => {
    if (!amount) return '0';
    const n = typeof amount === 'string' ? parseInt(amount) : amount;
    return (n / 1e18).toFixed(2);
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getReasonBadge = (reason) => {
    const badges = {
      task_reward: { label: 'Task Reward', class: 'badge-success' },
      task: { label: 'Task', class: 'badge-success' },
      jackpot: { label: 'Jackpot', class: 'badge-warning' },
      achievement: { label: 'Achievement', class: 'badge-info' },
      referral: { label: 'Referral', class: 'badge-primary' },
      manual: { label: 'Manual', class: 'badge-secondary' }
    };
    return badges[reason] || { label: reason, class: 'badge-secondary' };
  };

  return (
    <div className="page explorer-page">
      <div className="container">
        <div className="page-header">
          <h1>Network Explorer</h1>
          <p>Real-time activity on the TaoNet network</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{formatNumber(stats?.height || 0)}</span>
            <span className="stat-label">Block Height</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatNumber(stats?.totalProofs || proofs.length)}</span>
            <span className="stat-label">Total Proofs</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatNumber(stats?.totalTokens || 0)}</span>
            <span className="stat-label">Tokens Generated</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats?.avgProcessingTime || 0}ms</span>
            <span className="stat-label">Avg Processing</span>
          </div>
        </div>

        {stats?.anchors && (
          <div className="anchor-status card">
            <div className="card-header">
              <h3>Solana Anchors</h3>
              {stats.anchors.latestSolanaTx && (
                <a 
                  href={`https://solscan.io/tx/${stats.anchors.latestSolanaTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  View on Solscan
                </a>
              )}
            </div>
            <div className="anchor-stats">
              <div className="anchor-stat">
                <span className="value">{stats.anchors.total}</span>
                <span className="label">Total</span>
              </div>
              <div className="anchor-stat">
                <span className="value">{stats.anchors.latestAnchoredBlock}</span>
                <span className="label">Latest Block</span>
              </div>
              <div className="anchor-stat">
                <span className="value">{stats.anchors.unanchoredBlocks}</span>
                <span className="label">Pending</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="explorer-tabs">
          <button 
            className={`tab ${activeTab === 'proofs' ? 'active' : ''}`}
            onClick={() => setActiveTab('proofs')}
          >
            Proofs
          </button>
          <button 
            className={`tab ${activeTab === 'airdrops' ? 'active' : ''}`}
            onClick={() => setActiveTab('airdrops')}
          >
            Airdrops
          </button>
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
        </div>

        {/* Proofs Tab */}
        {activeTab === 'proofs' && (
          <div className="card">
            <div className="card-header">
              <h3>Recent Proofs</h3>
              <span className="proof-count">{proofs.length} latest</span>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading proofs...</p>
              </div>
            ) : proofs.length === 0 ? (
              <div className="empty-state">
                <h3>No proofs yet</h3>
                <p>Proofs will appear here when miners complete tasks</p>
              </div>
            ) : (
              <div className="proofs-list">
                {proofs.map((proof) => (
                  <div 
                    key={proof._id} 
                    className={`proof-item ${expanded === proof._id ? 'expanded' : ''}`}
                    onClick={() => setExpanded(expanded === proof._id ? null : proof._id)}
                  >
                    <div className="proof-main">
                      <div className="proof-block">
                        <span className="block-num">#{proof.blockNumber || '?'}</span>
                        <span className="badge badge-success">Verified</span>
                      </div>
                      
                      <div className="proof-info">
                        <span className="proof-hash" title={proof.blockHash}>
                          {proof.blockHash?.slice(0, 20)}...
                        </span>
                        <span className="proof-miner">
                          by {proof.miner?.slice(0, 6)}...{proof.miner?.slice(-4)}
                        </span>
                      </div>
                      
                      <div className="proof-meta">
                        <span className="meta-item">{proof.tokensGenerated || 0} tokens</span>
                        <span className="meta-item">{proof.processingTimeMs || 0}ms</span>
                      </div>
                    </div>
                    
                    {expanded === proof._id && (
                      <div className="proof-details">
                        <div className="detail-row">
                          <label>Block Hash</label>
                          <code>{proof.blockHash}</code>
                        </div>
                        <div className="detail-row">
                          <label>Previous Hash</label>
                          <code>{proof.previousHash}</code>
                        </div>
                        <div className="detail-row">
                          <label>Input Hash</label>
                          <code>{proof.inputHash}</code>
                        </div>
                        <div className="detail-row">
                          <label>Output Hash</label>
                          <code>{proof.outputHash}</code>
                        </div>
                        {proof.input && (
                          <div className="detail-row">
                            <label>Prompt</label>
                            <p className="prompt-text">{proof.input}</p>
                          </div>
                        )}
                        {proof.output && (
                          <div className="detail-row">
                            <label>Response</label>
                            <p className="response-text">{proof.output}</p>
                          </div>
                        )}
                        <div className="detail-row">
                          <label>Timestamp</label>
                          <span>{new Date(proof.timestamp || proof.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Airdrops Tab */}
        {activeTab === 'airdrops' && (
          <div className="card">
            <div className="card-header">
              <h3>Recent Airdrops</h3>
              <span className="proof-count">{airdrops.length} latest</span>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading airdrops...</p>
              </div>
            ) : airdrops.length === 0 ? (
              <div className="empty-state">
                <h3>No airdrops yet</h3>
                <p>Airdrops will appear here when rewards are distributed</p>
              </div>
            ) : (
              <div className="airdrops-list">
                {airdrops.map((airdrop, idx) => {
                  const badge = getReasonBadge(airdrop.reason);
                  return (
                    <div key={airdrop._id || idx} className="airdrop-item">
                      <div className="airdrop-icon">
                        {airdrop.status === 'success' ? '✓' : airdrop.status === 'pending' ? '...' : '!'}
                      </div>
                      
                      <div className="airdrop-info">
                        <div className="airdrop-main">
                          <span className="airdrop-address">
                            {airdrop.recipientAddress?.slice(0, 6)}...{airdrop.recipientAddress?.slice(-4)}
                          </span>
                          <span className={`badge ${badge.class}`}>{badge.label}</span>
                        </div>
                        <div className="airdrop-meta">
                          <span className="airdrop-time">{timeAgo(airdrop.createdAt)}</span>
                          {airdrop.txSignature && (
                            <a 
                              href={`https://solscan.io/tx/${airdrop.txSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tx-link"
                              onClick={e => e.stopPropagation()}
                            >
                              View TX
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="airdrop-amount">
                        <span className="amount-value">+{formatTAO(airdrop.amount)}</span>
                        <span className="amount-label">TAO</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="card">
            <div className="card-header">
              <h3>Solana Transactions</h3>
            </div>
            
            <div className="transactions-info">
              <p>View all TaoNet transactions on Solscan:</p>
              <div className="tx-links">
                <a 
                  href="https://solscan.io/account/8NBZFGavSLHKUhw4JjvVo82RdDMky3A4tDnWUtjJ6LLW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  Treasury Wallet
                </a>
                <a 
                  href="https://solscan.io/token/5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  TAO Token
                </a>
                <a 
                  href="https://dexscreener.com/solana/5sU6TmbDe7pH99x6SaoZinjTLGFzFJGoeqC3VGmxpump"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  View Chart
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}