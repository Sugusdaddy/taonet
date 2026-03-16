import { useState, useEffect } from 'react';
import api from '../api';
import './Explorer.css';

export default function Explorer() {
  const [stats, setStats] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const [statsRes, proofsRes] = await Promise.all([
      api.get('/api/proofs/stats'),
      api.get('/api/proofs?limit=20')
    ]);
    
    if (statsRes) setStats(statsRes);
    if (proofsRes?.proofs) setProofs(proofsRes.proofs);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="explorer-page">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="explorer-page">
      <div className="container">
        {/* Header */}
        <div className="explorer-header">
          <div>
            <h1>Proof Explorer</h1>
            <p className="text-secondary">Verify AI inference on the blockchain</p>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>

        {/* What is this */}
        <div className="info-banner">
          <h3>What is Proof of Inference?</h3>
          <p>
            Every AI task creates a cryptographic proof. The input prompt and output response 
            are hashed (SHA256), creating an immutable record. Anyone can verify that the 
            AI actually processed the request by recomputing the hashes.
          </p>
        </div>

        {/* Stats */}
        <div className="explorer-stats">
          <div className="stat-box">
            <span className="stat-value">{stats?.chain?.height || 0}</span>
            <span className="stat-label">Block Height</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{stats?.chain?.totalBlocks || 0}</span>
            <span className="stat-label">Total Proofs</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{stats?.inference?.uniqueMiners || 0}</span>
            <span className="stat-label">Unique Miners</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{api.formatNumber(stats?.inference?.totalTokensGenerated || 0)}</span>
            <span className="stat-label">Tokens Generated</span>
          </div>
        </div>

        {/* Proofs */}
        <div className="proofs-section">
          <h2>Recent Proofs</h2>
          
          {proofs.length > 0 ? (
            <div className="proofs-list">
              {proofs.map((proof) => (
                <div key={proof.blockHash} className="proof-card">
                  <div className="proof-header">
                    <span className="block-number">#{proof.blockNumber}</span>
                    <span className="proof-time">{api.timeAgo(proof.createdAt)}</span>
                  </div>
                  
                  <div className="proof-content">
                    <div className="proof-row">
                      <label>Miner</label>
                      <span className="mono">{api.shortAddress(proof.miner)}</span>
                    </div>
                    <div className="proof-row">
                      <label>Model</label>
                      <span>{proof.model || 'Llama 3.2 1B'}</span>
                    </div>
                    <div className="proof-row">
                      <label>Tokens</label>
                      <span>{proof.tokensGenerated || 0}</span>
                    </div>
                    <div className="proof-row">
                      <label>Time</label>
                      <span>{proof.processingTimeMs || 0}ms</span>
                    </div>
                  </div>
                  
                  <div className="proof-hashes">
                    <div className="hash-row">
                      <label>Block Hash</label>
                      <code>{proof.blockHash}</code>
                    </div>
                    <div className="hash-row">
                      <label>Input Hash</label>
                      <code>{proof.inputHash}</code>
                    </div>
                    <div className="hash-row">
                      <label>Output Hash</label>
                      <code>{proof.outputHash}</code>
                    </div>
                  </div>
                  
                  <div className="proof-footer">
                    <span className="verified-badge">Verified</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Proofs Yet</h3>
              <p>Start mining to generate the first inference proofs!</p>
              <a href="/mine" className="btn btn-primary mt-md">Start Mining</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
