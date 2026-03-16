import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useMining } from '../context/MiningContext';
import api from '../api';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { wallet, isConnected, connect, disconnect } = useWallet();
  const { isMining } = useMining();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/mine', label: 'Mine' },
    { path: '/explorer', label: 'Explorer' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/rewards', label: 'Rewards' },
    { path: '/docs', label: 'Docs' },
  ];

  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">T</span>
          <span className="logo-text">TaoNet</span>
          {isMining && (
            <span className="mining-indicator">
              <span className="mining-dot"></span>
              Mining
            </span>
          )}
        </Link>

        <nav className="nav">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">{api.shortAddress(wallet)}</span>
              <button onClick={disconnect} className="btn btn-ghost btn-sm">
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
    </header>
  );
}
