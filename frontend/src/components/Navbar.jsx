import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const { wallet, isConnected, walletName } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  const shortAddress = (addr) => addr ? `${addr.slice(0,4)}...${addr.slice(-4)}` : '';

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: '/', label: 'Home', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { path: '/mine', label: 'Mine', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    )},
    { path: '/validators', label: 'Stake', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="5"/>
        <path d="M12 13v8M8 21h8"/>
      </svg>
    )},
    { path: '/leaderboard', label: 'Ranks', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 21V12M12 21V8M16 21V4M20 21V2M4 21v-6"/>
      </svg>
    )},
    { path: '/dashboard', label: 'Profile', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    )}
  ];

  const moreLinks = [
    { path: '/explorer', label: 'Explorer' },
    { path: '/achievements', label: 'Achievements' },
    { path: '/tournaments', label: 'Tournaments' },
    { path: '/docs', label: 'Documentation' }
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="navbar desktop-nav">
        <div className="container">
          <div className="nav-inner">
            <Link to="/" className="nav-logo">
              <img src="/logo.svg" alt="TaoNet" className="logo-img" />
              <span className="logo-text">TaoNet</span>
            </Link>
            
            <div className="nav-links">
              {navLinks.map(link => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/explorer" className={`nav-link ${isActive('/explorer') ? 'active' : ''}`}>
                Explorer
              </Link>
              <Link to="/playground" className={`nav-link ${isActive('/playground') ? 'active' : ''}`}>
                AI Chat
              </Link>
              <Link to="/docs" className={`nav-link ${isActive('/docs') ? 'active' : ''}`}>
                Docs
              </Link>
            </div>
            
            <div className="nav-actions">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="mobile-header">
        <Link to="/" className="mobile-logo">
          <img src="/logo.svg" alt="TaoNet" />
        </Link>
        
        <div className="mobile-header-actions">
          <WalletMultiButton />
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navLinks.map(link => (
          <Link 
            key={link.path}
            to={link.path} 
            className={`bottom-nav-item ${isActive(link.path) ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{link.icon}</span>
            <span className="bottom-nav-label">{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}