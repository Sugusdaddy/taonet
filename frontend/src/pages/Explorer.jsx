import { useState, useEffect } from 'react';
import api from '../api';
import './Explorer.css';

export default function Explorer() {
  const [proofs, setProofs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [proofsRes, statsRes] = await Promise.all([
        api.getProofs({ limit: 30 }),
        api.get('/api/proofs/stats')
      ]);
      if (proofsRes?.proofs) setProofs(proofsRes.proofs);
      if (statsRes) setStats(statsRes);
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

  return (
    <div className="page explorer-page">
      <div className="container">
        <div className="page-header">
          <h1>Proof Explorer</h1>
          <p>All verified AI computations on TaoNet</p>
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
                  href={`https://solscan.io/tx/${stats.anchors.latestSolanaTx}?cluster=devnet`}
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
      </div>
    </div>
  );
}
