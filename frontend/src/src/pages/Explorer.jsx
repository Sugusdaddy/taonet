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
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const [proofsRes, statsRes] = await Promise.all([
      api.getProofs({ limit: 20 }),
      api.get('/proofs/stats')
    ]);
    if (proofsRes?.proofs) setProofs(proofsRes.proofs);
    if (statsRes) setStats(statsRes);
    setLoading(false);
  }

  return (
    <div className="page explorer-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Proof Explorer</h1>
            <p>Real-time view of all verified AI computations</p>
          </div>
          <div className="live-indicator">
            <span className="status-dot online"></span>
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.chainHeight || 0}</span>
              <span className="stat-label">Chain Height</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalProofs || proofs.length}</span>
              <span className="stat-label">Total Proofs</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.uniqueMiners || 0}</span>
              <span className="stat-label">Unique Miners</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{api.formatNumber(stats?.totalTokens || 0)}</span>
              <span className="stat-label">Tokens Generated</span>
            </div>
          </div>
        </div>

        {/* Proofs List */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Proofs</h3>
            <span className="proof-count">{proofs.length} proofs</span>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading proofs...</p>
            </div>
          ) : proofs.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12h8M12 8v8"/>
              </svg>
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
                        {proof.blockHash?.slice(0, 16)}...
                      </span>
                      <span className="proof-miner">
                        {api.shortAddress(proof.miner)}
                      </span>
                    </div>
                    
                    <div className="proof-meta">
                      <span>{proof.tokensGenerated || 0} tokens</span>
                      <span>{proof.processingTimeMs || 0}ms</span>
                      <span>{api.timeAgo(proof.createdAt)}</span>
                    </div>
                  </div>
                  
                  {expanded === proof._id && (
                    <div className="proof-details">
                      <div className="detail-row">
                        <label>Input Hash</label>
                        <code>{proof.inputHash}</code>
                      </div>
                      <div className="detail-row">
                        <label>Output Hash</label>
                        <code>{proof.outputHash}</code>
                      </div>
                      <div className="detail-row">
                        <label>Model</label>
                        <span>{proof.model || 'Llama-3.2-1B'}</span>
                      </div>
                      {proof.prompt && (
                        <div className="detail-row">
                          <label>Prompt</label>
                          <p className="prompt-text">{proof.prompt}</p>
                        </div>
                      )}
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
