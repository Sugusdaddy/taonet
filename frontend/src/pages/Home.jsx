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
    <div className="page home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Mine with your browser. Earn with AI.</h1>
            <p className="hero-desc">
              TaoNet is a decentralized inference network. Miners contribute compute to process AI tasks and earn TAO tokens. Every computation is verified and anchored to Solana.
            </p>
            <div className="hero-actions">
              <Link to="/mine" className="btn btn-primary btn-lg">Start Mining</Link>
              <Link to="/explorer" className="btn btn-secondary btn-lg">View Explorer</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="value">{stats?.chain?.height || 0}</span>
                <span className="label">Proofs</span>
              </div>
              <div className="hero-stat">
                <span className="value">{stats?.network?.totalMiners || 0}</span>
                <span className="label">Miners</span>
              </div>
              <div className="hero-stat">
                <span className="value">{stats?.tasks?.completed || 0}</span>
                <span className="label">Tasks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <h3>Connect Wallet</h3>
              <p>Connect your Solana wallet to authenticate and receive rewards.</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <h3>Start Mining</h3>
              <p>Your browser processes AI tasks using WebGPU or server compute.</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <h3>Earn Rewards</h3>
              <p>Get TAO tokens for each task. Higher difficulty, higher rewards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Why TaoNet</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h4>Proof of Inference</h4>
              <p>Every AI computation generates a cryptographic proof that can be verified.</p>
            </div>
            <div className="feature-card">
              <h4>Solana Anchored</h4>
              <p>Merkle roots anchored to Solana for immutable proof of computation.</p>
            </div>
            <div className="feature-card">
              <h4>Browser Mining</h4>
              <p>No downloads. Mine directly in your browser with WebGPU.</p>
            </div>
            <div className="feature-card">
              <h4>Real Rewards</h4>
              <p>Earn TAO tokens for every task. Rewards scale with difficulty.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to mine?</h2>
            <p>Join the network and start earning.</p>
            <Link to="/mine" className="btn btn-primary btn-lg">Start Mining</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
