import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Referrals.css';

export default function Referrals() {
  const { wallet, miner, isConnected, connect } = useWallet();
  const [copied, setCopied] = useState(false);

  const referralCode = miner?.referralCode || (wallet ? wallet.substring(0, 8).toUpperCase() : '');
  const referralLink = `https://taonet.fun/mine?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <main className="referrals-page">
        <div className="container">
          <div className="empty-state">
            <h2>Connect to Access Referrals</h2>
            <p>Connect your wallet to get your referral link</p>
            <button className="btn btn-primary mt-lg" onClick={connect}>Connect Wallet</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="referrals-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Referrals</h1>
          <p className="page-subtitle">Earn 10% of everything your referrals earn</p>
        </div>

        {/* Stats */}
        <div className="referral-stats">
          <div className="referral-stat">
            <span className="stat-value">{miner?.referralCount || 0}</span>
            <span className="stat-label">Total Referrals</span>
          </div>
          <div className="referral-stat">
            <span className="stat-value">{api.formatNumber(miner?.referralEarnings || 0)}</span>
            <span className="stat-label">Tokens Earned</span>
          </div>
        </div>

        {/* Link */}
        <div className="card">
          <h3 className="card-title mb-lg">Your Referral Link</h3>
          <div className="input-group">
            <input 
              type="text" 
              className="input font-mono" 
              value={referralLink} 
              readOnly 
            />
            <button className="btn btn-primary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-md text-tertiary" style={{ fontSize: '13px' }}>
            Share this link. When someone signs up and starts mining, you earn 10% of their rewards forever.
          </p>
        </div>

        {/* How it Works */}
        <div className="card mt-lg">
          <h3 className="card-title mb-lg">How It Works</h3>
          <div className="steps-list">
            <div className="step-item">
              <div className="step-num">1</div>
              <div>
                <h4>Share Your Link</h4>
                <p>Send your referral link to friends</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <div>
                <h4>They Sign Up</h4>
                <p>They register and start mining</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <div>
                <h4>You Both Earn</h4>
                <p>They get 100 XP bonus, you get 10% of their earnings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
