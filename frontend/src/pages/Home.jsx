import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Home.css';

export default function Home() {
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
    <main className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">Decentralized AI Network</div>
            <h1 className="hero-title">
              Mine Crypto with
              <span className="gradient-text"> Your GPU</span>
            </h1>
            <p className="hero-subtitle">
              Run AI inference tasks on your browser. Earn rewards for contributing 
              compute power to the world's first Proof of Inference network.
            </p>
            <div className="hero-actions">
              <Link to="/mine" className="btn btn-primary btn-lg">
                Start Mining
              </Link>
              <Link to="/docs" className="btn btn-secondary btn-lg">
                Learn More
              </Link>
            </div>
          </div>
          
          {/* Live Stats */}
          {stats && (
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.network?.onlineMiners || 0}</span>
                <span className="stat-label">Miners Online</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.tasks?.total || 0}</span>
                <span className="stat-label">Tasks Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{api.formatNumber(stats.rewards?.totalDistributed || 0)}</span>
                <span className="stat-label">TAO Distributed</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Background Effects */}
        <div className="hero-glow"></div>
        <div className="hero-grid"></div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <h2 className="section-title text-center">How It Works</h2>
          <p className="section-subtitle text-center">Three simple steps to start earning</p>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Connect Wallet</h3>
              <p>Connect your Solana wallet (Phantom) to get started. Your wallet is your miner identity.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Load AI Model</h3>
              <p>Download the AI model to your browser. Uses WebGPU for fast local inference.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Earn Rewards</h3>
              <p>Complete AI tasks automatically and earn TAO tokens. More compute = more rewards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section bg-dark">
        <div className="container">
          <h2 className="section-title text-center">Why TaoNet?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">AI</div>
              <h3>Real AI Work</h3>
              <p>Not fake mining. Your GPU runs real Llama 3.2 inference tasks locally in your browser.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">#</div>
              <h3>Proof of Inference</h3>
              <p>Every task is cryptographically verified. Input/output hashes create an immutable proof chain.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">$</div>
              <h3>Earn While Idle</h3>
              <p>Let your browser mine while you work. Automatic task processing with minimal resource usage.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">*</div>
              <h3>Tier Multipliers</h3>
              <p>Stake TAO to increase your earnings. Diamond tier earns 3x rewards on every task.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container text-center">
          <h2 className="section-title">Ready to Mine?</h2>
          <p className="section-subtitle">Join the decentralized AI revolution</p>
          <Link to="/mine" className="btn btn-primary btn-lg">
            Start Mining Now
          </Link>
        </div>
      </section>
    </main>
  );
}
