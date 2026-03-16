import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';
import './Footer.css';

export default function Footer() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats);
    const interval = setInterval(() => api.getStats().then(setStats), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.svg" alt="TaoNet" />
              <span>TaoNet</span>
            </div>
            <p className="footer-desc">
              Decentralized AI inference network powered by Proof of Inference consensus. 
              Earn rewards by contributing compute to the network.
            </p>
            <div className="footer-social">
              <a href="https://github.com/Sugusdaddy/taonet" target="_blank" rel="noopener noreferrer" title="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://x.com/TaonetL2" target="_blank" rel="noopener noreferrer" title="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="footer-links">
            <h4>Product</h4>
            <ul>
              <li><Link to="/mine">Start Mining</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/leaderboard">Leaderboard</Link></li>
              <li><Link to="/explorer">Proof Explorer</Link></li>
            </ul>
          </div>
          
          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://github.com/Sugusdaddy/taonet" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li><a href="https://github.com/Sugusdaddy/taonet" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://solscan.io" target="_blank" rel="noopener noreferrer">Solscan</a></li>
            </ul>
          </div>
          
          <div className="footer-links">
            <h4>Network</h4>
            <ul>
              <li><span className="network-stat">{stats?.network?.totalMiners || 0} miners</span></li>
              <li><span className="network-stat">{stats?.chain?.height || 0} blocks</span></li>
              <li><span className="network-stat">{stats?.tasks?.completed || 0} tasks</span></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-legal">
            <span>2026 TaoNet</span>
          </div>
          <div className="footer-tech">
            <span>Built on</span>
            <a href="https://solana.com" target="_blank" rel="noopener noreferrer">Solana</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
