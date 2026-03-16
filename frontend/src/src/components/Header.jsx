import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useMining } from '../context/MiningContext';
import api from '../api';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { wallet, isConnected, connect, disconnect } = useWallet();
  const { isMining, sessionStats } = useMining();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/mine', label: 'Mine' },
    { path: '/playground', label: 'SolanaGPT' },
    { path: '/explorer', label: 'Explorer' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/docs', label: 'Docs' },
  ];

  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          <Link to="/" className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
                <line x1="12" y1="22" x2="12" y2="15.5"/>
                <polyline points="22 8.5 12 15.5 2 8.5"/>
              </svg>
            </div>
            <span className="logo-text">TaoNet</span>
            {isMining && (
              <div className="mining-pill">
                <span className="mining-dot"></span>
                <span>{sessionStats.tasksCompleted} tasks</span>
              </div>
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
              <div className="wallet-connected">
                <div className="wallet-address">
                  <span className="wallet-dot"></span>
                  {api.shortAddress(wallet)}
                </div>
                <button onClick={disconnect} className="btn btn-ghost btn-sm">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connect} className="btn btn-primary">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
