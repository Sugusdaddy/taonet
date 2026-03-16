import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Home.css';

export default function Home() {
  const { isConnected, connect } = useWallet();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    const data = await api.getStats();
    if (data) setStats(data);
  }

  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
          <div className="hero-glow"></div>
        </div>
        
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot"></span>
              Decentralized AI Network
            </div>
            
            <h1 className="hero-title">
              Earn crypto by running
              <span className="gradient-text"> AI inference</span>
            </h1>
            
            <p className="hero-description">
              TaoNet is the first Proof of Inference network. Your browser runs real AI 
              tasks using WebGPU, earning rewards for every computation verified on-chain.
            </p>
            
            <div className="hero-cta">
              {isConnected ? (
                <Link to="/mine" className="btn btn-primary btn-lg">
                  Start Mining
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              ) : (
                <button onClick={connect} className="btn btn-primary btn-lg">
                  Connect Wallet
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              )}
              <Link to="/docs" className="btn btn-secondary btn-lg">
                Documentation
              </Link>
            </div>

            {/* Live Stats */}
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">{stats?.network?.onlineMiners || 0}</span>
                <span className="stat-label">Miners Online</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-value">{stats?.tasks?.completed || 0}</span>
                <span className="stat-label">Tasks Done</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <span className="stat-value">{api.formatNumber(stats?.rewards?.totalDistributed || 0)}</span>
                <span className="stat-label">TAO Distributed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>How it works</h2>
            <p>Three steps to start earning</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <path d="M6 12h4M14 12h4"/>
                </svg>
              </div>
              <div className="step-number">01</div>
              <h3>Connect</h3>
              <p>Link your Phantom wallet. This becomes your miner identity on the network.</p>
            </div>
            
            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="step-number">02</div>
              <h3>Load Model</h3>
              <p>Download Llama 3.2 to your browser. Uses WebGPU for fast local inference.</p>
            </div>
            
            <div className="step">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div className="step-number">03</div>
              <h3>Earn</h3>
              <p>Process AI tasks automatically. Every completion is verified and rewarded.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <h2>Why TaoNet</h2>
            <p>Real AI work, real rewards</p>
          </div>
          
          <div className="features">
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
                </svg>
              </div>
              <h3>Proof of Inference</h3>
              <p>Every task creates a cryptographic proof. Input and output hashes form an immutable chain.</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <path d="M9 9h6v6H9z"/>
                </svg>
              </div>
              <h3>Browser Mining</h3>
              <p>No downloads or setup. Your browser's GPU runs real Llama inference via WebGPU.</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <h3>Tier Multipliers</h3>
              <p>Stake TAO to boost earnings. Diamond tier earns 3x on every task completed.</p>
            </div>
            
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <h3>Verifiable</h3>
              <p>Check any proof in the explorer. Recompute hashes yourself to verify work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to mine?</h2>
            <p>Join the decentralized AI revolution</p>
            <Link to="/mine" className="btn btn-primary btn-lg">
              Start Mining
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
