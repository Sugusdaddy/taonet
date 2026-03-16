import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">Tao<span>Net</span></Link>
            <p>Decentralized AI inference network built on Solana.</p>
          </div>
          
          <div className="footer-links">
            <h4>Product</h4>
            <Link to="/mine">Mine</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <Link to="/rewards">Rewards</Link>
          </div>
          
          <div className="footer-links">
            <h4>Resources</h4>
            <Link to="/docs">Documentation</Link>
            <Link to="/developers">API</Link>
            <a href="https://github.com/Sugusdaddy/taonet" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          
          <div className="footer-links">
            <h4>Community</h4>
            <Link to="/tournaments">Tournaments</Link>
            <Link to="/achievements">Achievements</Link>
            <Link to="/referrals">Referrals</Link>
          </div>
        </div>
        
        <div className="footer-bottom">
          TaoNet 2026. Built on Solana.
        </div>
      </div>
    </footer>
  );
}
