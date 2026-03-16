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
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="logo-text">TaoNet</span>
          </Link>
          
          <div className="nav-links">
            <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
            <Link to="/mine" className={isActive('/mine') ? 'active' : ''}>Mine</Link>
            <Link to="/explorer" className={isActive('/explorer') ? 'active' : ''}>Explorer</Link>
            <Link to="/leaderboard" className={isActive('/leaderboard') ? 'active' : ''}>Leaderboard</Link>
            <Link to="/playground" className={isActive('/playground') ? 'active' : ''}>Playground</Link>
          </div>
          
          <div className="nav-actions">
            {isConnected ? (
              <div className="wallet-connected">
                <span className="wallet-address">{shortAddress(wallet)}</span>
                <button onClick={disconnect} className="btn-disconnect" title="Disconnect">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
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
