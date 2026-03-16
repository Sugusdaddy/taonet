import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { wallet, isConnected, connect, disconnect } = useWallet();
  
  const isActive = (path) => location.pathname === path;
  
  const shortAddress = (addr) => addr ? `${addr.slice(0,4)}...${addr.slice(-4)}` : '';

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <img src="/logo.svg" alt="TaoNet" className="logo-img" />
            <span className="logo-text">TaoNet</span>
          </Link>
          
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              Dashboard
            </Link>
            <Link to="/mine" className={`nav-link ${isActive('/mine') ? 'active' : ''}`}>
              Mine
            </Link>
            <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}>
              Leaderboard
            </Link>
            <Link to="/explorer" className={`nav-link ${isActive('/explorer') ? 'active' : ''}`}>
              Explorer
            </Link>
            <Link to="/playground" className={`nav-link ${isActive('/playground') ? 'active' : ''}`}>
              AI Chat
            </Link>
          </div>
          
          <div className="nav-actions">
            {isConnected ? (
              <div className="wallet-connected">
                <span className="wallet-address">{shortAddress(wallet)}</span>
                <button onClick={disconnect} className="btn btn-secondary btn-sm">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connect} className="btn btn-primary btn-sm">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
