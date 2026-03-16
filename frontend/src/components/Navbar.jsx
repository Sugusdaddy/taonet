import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { wallet, isConnected, connect, disconnect } = useWallet();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-text">TaoNet</span>
          <span className="logo-badge">Beta</span>
        </Link>
        
        <div className="nav-links">
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/mine" className={isActive('/mine') ? 'active' : ''}>
            Mine
          </Link>
          <Link to="/playground" className={isActive('/playground') ? 'active' : ''}>
            SolanaGPT
          </Link>
          <Link to="/explorer" className={isActive('/explorer') ? 'active' : ''}>
            Explorer
          </Link>
          <Link to="/leaderboard" className={isActive('/leaderboard') ? 'active' : ''}>
            Leaderboard
          </Link>
        </div>
        
        <div className="nav-actions">
          {isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">{api.shortAddress(wallet)}</span>
              <button className="btn-disconnect" onClick={disconnect}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <button className="btn-connect" onClick={connect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
