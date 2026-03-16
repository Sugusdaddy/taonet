import { useState, useEffect } from 'react';
import api from '../api';
import './Explorer.css';

export default function Explorer() {
  const [proofs, setProofs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const [proofsData, statsData] = await Promise.all([
      api.get('/proofs?limit=20'),
      api.get('/proofs/stats')
    ]);
    if (proofsData) setProofs(proofsData);
    if (statsData) setStats(statsData);
    setLoading(false);
  }

  const formatHash = (hash) => {
    if (!hash) return '-';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <main className="explorer-page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Proof Explorer</h1>
            <p>Verify every AI inference on the chain</p>
          </div>
          <div className="live-badge">
            <span className="live-dot"></span>
            Live
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.height || 0}</span>
              <span className="stat-label">Chain Height</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalProofs || 0}</span>
              <span className="stat-label">Total Proofs</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.uniqueMiners || 0}</span>
              <span className="stat-label">Unique Miners</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{api.formatNumber(stats?.totalTokens || 0)}</span>
              <span className="stat-label">Tokens Generated</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="explanation-card">
          <h3>What is Proof of Inference?</h3>
          <p>
            Every AI task completed on TaoNet creates a cryptographic proof. The input prompt 
            and output response are hashed using SHA-256, creating a verifiable record that 
            the work was done. These proofs are chained together - each block references the 
            previous one, making the history immutable.
          </p>
          <div className="proof-diagram">
            <div className="diagram-block">
              <span className="block-label">Block N-1</span>
              <span className="block-hash">prevHash</span>
            </div>
            <svg className="diagram-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div className="diagram-block current">
              <span className="block-label">Block N</span>
              <span className="block-hash">blockHash</span>
            </div>
            <svg className="diagram-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div className="diagram-block">
              <span className="block-label">Block N+1</span>
              <span className="block-hash">nextHash</span>
            </div>
          </div>
        </div>

        {/* Proofs List */}
        <div className="proofs-section">
          <h2>Recent Proofs</h2>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading proofs...</p>
            </div>
          ) : proofs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 12h8"/>
                </svg>
              </div>
              <h3>No proofs yet</h3>
              <p>Start mining to create the first inference proof on the chain.</p>
            </div>
          ) : (
            <div className="proofs-list">
              {proofs.map(proof => (
                <div 
                  key={proof._id} 
                  className={`proof-card ${selectedProof?._id === proof._id ? 'selected' : ''}`}
                  onClick={() => setSelectedProof(selectedProof?._id === proof._id ? null : proof)}
                >
                  <div className="proof-header">
                    <div className="proof-block">
                      <span className="block-number">#{proof.blockNumber}</span>
                      <span className="verified-badge">Verified</span>
                    </div>
                    <span className="proof-time">{api.timeAgo(proof.timestamp)}</span>
                  </div>
                  
                  <div className="proof-body">
                    <div className="proof-row">
                      <span className="row-label">Block Hash</span>
                      <code className="row-value">{formatHash(proof.blockHash)}</code>
                    </div>
                    <div className="proof-row">
                      <span className="row-label">Miner</span>
                      <span className="row-value miner">{api.shortAddress(proof.miner)}</span>
                    </div>
                    <div className="proof-metrics">
                      <span>{proof.tokensGenerated || 0} tokens</span>
                      <span>{proof.processingTimeMs || 0}ms</span>
                    </div>
                  </div>
                  
                  {selectedProof?._id === proof._id && (
                    <div className="proof-details">
                      <div className="detail-section">
                        <label>Input Hash (SHA-256)</label>
                        <code>{proof.inputHash}</code>
                      </div>
                      <div className="detail-section">
                        <label>Output Hash (SHA-256)</label>
                        <code>{proof.outputHash}</code>
                      </div>
                      <div className="detail-section">
                        <label>Previous Block</label>
                        <code>{proof.previousHash || 'Genesis'}</code>
                      </div>
                      {proof.prompt && (
                        <div className="detail-section">
                          <label>Prompt</label>
                          <p>{proof.prompt}</p>
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
    </main>
  );
}
