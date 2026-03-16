import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { wallet, connect, disconnect, isConnected } = useWallet();

  const handleWalletClick = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      try {
        await connect();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const navItems = [
    { path: '/mine', label: 'Mine' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/rewards', label: 'Rewards' },
    { path: '/docs', label: 'Docs' },
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">
          Tao<span>Net</span>
        </Link>

        <nav className="nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <button className="wallet-btn" onClick={handleWalletClick}>
            {isConnected ? api.shortAddress(wallet) : 'Connect'}
          </button>
        </div>
      </div>
    </header>
  );
}
