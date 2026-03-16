import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Explorer.css';

export default function Explorer() {
  const [chainStats, setChainStats] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [searchHash, setSearchHash] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, proofsRes] = await Promise.all([
        fetch('https://api.taonet.fun/api/proofs/stats').then(r => r.json()),
        fetch('https://api.taonet.fun/api/proofs?limit=20').then(r => r.json())
      ]);
      setChainStats(statsRes);
      setProofs(proofsRes.proofs || []);
    } catch (e) {
      console.error('Failed to load explorer data:', e);
    }
    setLoading(false);
  };

  const loadProofDetails = async (blockNum) => {
    try {
      const res = await fetch(`https://api.taonet.fun/api/proofs/block/${blockNum}`).then(r => r.json());
      setSelectedProof(res.proof);
      setVerifyResult(null);
    } catch (e) {
      console.error('Failed to load proof:', e);
    }
  };

  const verifyProof = async (blockHash) => {
    try {
      const res = await fetch(`https://api.taonet.fun/api/proofs/verify/${blockHash}`).then(r => r.json());
      setVerifyResult(res);
    } catch (e) {
      setVerifyResult({ valid: false, error: e.message });
    }
  };

  const searchProof = async () => {
    if (!searchHash.trim()) return;
    try {
      const res = await fetch(`https://api.taonet.fun/api/proofs/block/${searchHash}`).then(r => r.json());
      if (res.proof) {
        setSelectedProof(res.proof);
        setVerifyResult(null);
      } else {
        alert('Block not found');
      }
    } catch (e) {
      alert('Block not found');
    }
  };

  const formatHash = (hash) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : '-';
  const formatDate = (date) => new Date(date).toLocaleString();

  return (
    <main className="explorer-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Inference Explorer</h1>
          <p className="page-subtitle">Verify real AI computations on the TaoNet chain</p>
        </div>

        {/* Chain Stats */}
        <div className="chain-stats">
          <div className="stat-card">
            <span className="stat-value">{chainStats?.chain?.height || 0}</span>
            <span className="stat-label">Block Height</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{chainStats?.chain?.totalBlocks || 0}</span>
            <span className="stat-label">Total Inferences</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{(chainStats?.inference?.totalTokensGenerated || 0).toLocaleString()}</span>
            <span className="stat-label">AI Tokens Generated</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{chainStats?.inference?.uniqueMiners || 0}</span>
            <span className="stat-label">Active Miners</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{chainStats?.chain?.blocksLast24h || 0}</span>
            <span className="stat-label">Last 24h</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{chainStats?.inference?.avgProcessingTimeMs || 0}ms</span>
            <span className="stat-label">Avg Time</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-box">
          <input 
            type="text" 
            className="input" 
            placeholder="Search by block number or hash (0x...)" 
            value={searchHash}
            onChange={(e) => setSearchHash(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchProof()}
          />
          <button className="btn btn-primary" onClick={searchProof}>Search</button>
        </div>

        <div className="explorer-grid">
          {/* Proof List */}
          <div className="card">
            <h3 className="card-title">Latest Inference Proofs</h3>
            {loading ? (
              <p className="text-muted">Loading...</p>
            ) : proofs.length === 0 ? (
              <div className="empty-state">
                <p>No inferences yet</p>
                <p className="text-sm">Start mining to generate verifiable AI proofs</p>
              </div>
            ) : (
              <div className="proof-list">
                {proofs.map((proof) => (
                  <div 
                    key={proof.blockNumber} 
                    className={`proof-item ${selectedProof?.blockNumber === proof.blockNumber ? 'selected' : ''}`}
                    onClick={() => loadProofDetails(proof.blockNumber)}
                  >
                    <div className="proof-header">
                      <span className="block-num">#{proof.blockNumber}</span>
                      <span className="block-time">{formatDate(proof.timestamp)}</span>
                    </div>
                    <div className="proof-hash">{formatHash(proof.blockHash)}</div>
                    <div className="proof-meta">
                      <span>{proof.tokensGenerated} tokens</span>
                      <span>{proof.processingTimeMs}ms</span>
                      <span className="miner-link">{formatHash(proof.miner)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proof Details */}
          <div className="card proof-details">
            <h3 className="card-title">Proof Details</h3>
            {selectedProof ? (
              <>
                <div className="detail-section">
                  <h4>Block Info</h4>
                  <div className="detail-row">
                    <span className="label">Block Number</span>
                    <span className="value">#{selectedProof.blockNumber}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Block Hash</span>
                    <span className="value mono">{selectedProof.blockHash}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Previous Hash</span>
                    <span className="value mono">{formatHash(selectedProof.previousHash)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Timestamp</span>
                    <span className="value">{formatDate(selectedProof.timestamp)}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Inference Data</h4>
                  <div className="detail-row">
                    <span className="label">Input Hash</span>
                    <span className="value mono">{selectedProof.inputHash}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Output Hash</span>
                    <span className="value mono">{selectedProof.outputHash}</span>
                  </div>
                  {selectedProof.input && (
                    <div className="detail-row column">
                      <span className="label">Input (Prompt)</span>
                      <div className="value-box">{selectedProof.input}</div>
                    </div>
                  )}
                  {selectedProof.output && (
                    <div className="detail-row column">
                      <span className="label">Output (AI Response)</span>
                      <div className="value-box">{selectedProof.output}</div>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>Miner & Metrics</h4>
                  <div className="detail-row">
                    <span className="label">Miner</span>
                    <span className="value mono">{selectedProof.miner}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Model</span>
                    <span className="value">{selectedProof.model}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Tokens Generated</span>
                    <span className="value">{selectedProof.tokensGenerated}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Processing Time</span>
                    <span className="value">{selectedProof.processingTimeMs}ms</span>
                  </div>
                </div>

                {/* Verify Button */}
                <button 
                  className="btn btn-primary w-full mt-md"
                  onClick={() => verifyProof(selectedProof.blockHash)}
                >
                  Verify Proof On-Chain
                </button>

                {verifyResult && (
                  <div className={`verify-result ${verifyResult.valid ? 'valid' : 'invalid'}`}>
                    {verifyResult.valid ? (
                      <>
                        <span className="verify-icon">VALID</span>
                        <p>Cryptographic verification passed</p>
                        <ul>
                          <li>Input hash matches: SHA256(prompt) = inputHash</li>
                          <li>Output hash matches: SHA256(response) = outputHash</li>
                          <li>Chain link valid: previousHash links to block #{selectedProof.blockNumber - 1}</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        <span className="verify-icon">INVALID</span>
                        <p>Verification failed: {verifyResult.error}</p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Select a proof to view details</p>
                <p className="text-sm">Click on any inference in the list to see the full proof data and verify it</p>
              </div>
            )}
          </div>
        </div>

        {/* How it Works */}
        <div className="card mt-lg">
          <h3 className="card-title">How Proof of Inference Works</h3>
          <div className="how-works">
            <div className="how-step">
              <span className="step-num">1</span>
              <div>
                <h4>Task Submission</h4>
                <p>A client submits a prompt to the TaoNet network</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-num">2</span>
              <div>
                <h4>GPU Inference</h4>
                <p>A miner's GPU runs the AI model (Llama 3.2 1B) locally via WebGPU</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-num">3</span>
              <div>
                <h4>Proof Generation</h4>
                <p>SHA256 hashes of input and output are computed. A block is created with the previous block's hash, forming a chain.</p>
              </div>
            </div>
            <div className="how-step">
              <span className="step-num">4</span>
              <div>
                <h4>Verification</h4>
                <p>Anyone can verify: recompute hashes and check they match. The chain link ensures no tampering.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
