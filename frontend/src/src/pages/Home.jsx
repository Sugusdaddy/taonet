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
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
        </div>
        
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="pulse-dot"></span>
              Decentralized AI Network
            </div>
            
            <h1>
              Earn crypto by running
              <span className="gradient-text"> AI inference</span>
            </h1>
            
            <p className="hero-desc">
              TaoNet is the first Proof of Inference network. Your browser runs real AI 
              tasks using WebGPU, earning rewards for every computation verified on-chain.
            </p>
            
            <div className="hero-cta">
              {isConnected ? (
                <Link to="/mine" className="btn btn-primary btn-lg">
                  Start Mining
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              ) : (
                <button onClick={connect} className="btn btn-primary btn-lg">
                  Connect Wallet
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              )}
              <Link to="/explorer" className="btn btn-secondary btn-lg">
                View Explorer
              </Link>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="value">{stats?.network?.onlineMiners || 0}</span>
                <span className="label">Miners Online</span>
              </div>
              <div className="divider"></div>
              <div className="hero-stat">
                <span className="value">{stats?.tasks?.completed || 0}</span>
                <span className="label">Tasks Completed</span>
              </div>
              <div className="divider"></div>
              <div className="hero-stat">
                <span className="value">{api.formatNumber(stats?.rewards?.totalDistributed || 0)}</span>
                <span className="label">TAO Distributed</span>
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
            <p>Three simple steps to start earning</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <h3>Connect Wallet</h3>
              <p>Connect your Phantom wallet to get started. No sign-up required.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
                </svg>
              </div>
              <h3>Run AI Tasks</h3>
              <p>Your GPU processes real AI inference using WebGPU technology.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>Earn Rewards</h3>
              <p>Get TAO tokens for every verified proof. More power = more earnings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <h2>Why TaoNet?</h2>
            <p>The future of decentralized AI computation</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Proof of Inference</h3>
              <p>Every AI computation is cryptographically verified and anchored to Solana blockchain.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3>WebGPU Powered</h3>
              <p>Run Llama 3.2 directly in your browser using cutting-edge WebGPU technology.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <h3>Instant Rewards</h3>
              <p>Earn TAO tokens immediately after task completion. No waiting periods.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h3>Community Driven</h3>
              <p>Join thousands of miners powering the decentralized AI revolution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to start mining?</h2>
            <p>Join the network and start earning today</p>
            <Link to="/mine" className="btn btn-primary btn-lg">
              Launch Miner
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
