import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Validators.css';

export default function Validators() {
  const { wallet, isConnected, connect } = useWallet();
  const [validators, setValidators] = useState([]);
  const [userStakes, setUserStakes] = useState([]);
  const [selectedValidator, setSelectedValidator] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);
  const [stats, setStats] = useState({ totalStaked: '0', totalDelegators: 0, avgApy: '0' });

  useEffect(() => {
    loadValidators();
    loadStats();
  }, []);

  useEffect(() => {
    if (wallet) {
      loadUserStakes();
    }
  }, [wallet]);

  async function loadValidators() {
    try {
      const res = await fetch('https://api.taonet.fun/api/validators');
      const data = await res.json();
      setValidators(data);
    } catch (error) {
      console.error('Error loading validators:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('https://api.taonet.fun/api/validators/stats/overview');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadUserStakes() {
    try {
      const res = await fetch(`https://api.taonet.fun/api/validators/stakes/${wallet}`);
      const data = await res.json();
      setUserStakes(data);
    } catch (error) {
      console.error('Error loading user stakes:', error);
    }
  }

  const formatNumber = (num) => {
    const n = typeof num === 'string' ? parseInt(num) / 1e9 : num;
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
  };

  const formatTao = (amount) => {
    const n = typeof amount === 'string' ? parseInt(amount) / 1e9 : amount / 1e9;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const handleStake = (validator) => {
    if (!isConnected) {
      connect();
      return;
    }
    setSelectedValidator(validator);
    setShowStakeModal(true);
  };

  const confirmStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0 || !selectedValidator) return;
    
    const minStake = parseInt(selectedValidator.minStake) / 1e9;
    if (parseFloat(stakeAmount) < minStake) {
      alert(`Minimum stake is ${minStake} TAO`);
      return;
    }
    
    setStaking(true);
    
    try {
      // Convert to smallest units (1e9)
      const amountInUnits = BigInt(Math.floor(parseFloat(stakeAmount) * 1e9)).toString();
      
      // Get transaction to sign
      const res = await fetch('https://api.taonet.fun/api/validators/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet,
          validatorId: selectedValidator.id,
          amount: amountInUnits
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      // For now, simulate successful stake (in production would use Phantom to sign)
      alert(`Staking ${stakeAmount} TAO on ${selectedValidator.name}...\n\nIn production, this would open Phantom wallet to sign the transaction.`);
      
      // Reload data
      await loadValidators();
      await loadUserStakes();
      
      setShowStakeModal(false);
      setStakeAmount('');
      setSelectedValidator(null);
    } catch (error) {
      console.error('Error staking:', error);
      alert('Failed to stake. Please try again.');
    } finally {
      setStaking(false);
    }
  };

  const getUserStake = (validatorId) => {
    const stake = userStakes.find(s => s.validatorId === validatorId);
    return stake ? parseInt(stake.amount) / 1e9 : 0;
  };

  const filteredValidators = activeTab === 'staked' 
    ? validators.filter(v => getUserStake(v.id) > 0)
    : validators;

  const totalStakedDisplay = formatNumber(stats.totalStaked);
  const avgApyDisplay = stats.avgApy || '0';

  if (loading) {
    return (
      <div className="page validators-page">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading validators...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page validators-page">
      <div className="container">
        {/* Header */}
        <div className="validators-header">
          <div className="header-content">
            <h1>Validator Staking</h1>
            <p>Stake TAO tokens on AI subnets and earn rewards</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="staking-stats">
          <div className="staking-stat">
            <span className="stat-value">{totalStakedDisplay}</span>
            <span className="stat-label">Total Staked</span>
          </div>
          <div className="staking-stat">
            <span className="stat-value">{avgApyDisplay}%</span>
            <span className="stat-label">Avg APY</span>
          </div>
          <div className="staking-stat">
            <span className="stat-value">{validators.length}</span>
            <span className="stat-label">Subnets</span>
          </div>
          <div className="staking-stat">
            <span className="stat-value">{stats.totalDelegators || 0}</span>
            <span className="stat-label">Delegators</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="validator-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Subnets
          </button>
          <button 
            className={`tab ${activeTab === 'staked' ? 'active' : ''}`}
            onClick={() => setActiveTab('staked')}
          >
            My Stakes
          </button>
        </div>

        {/* Validators Grid */}
        <div className="validators-grid">
          {filteredValidators.map(validator => {
            const userStake = getUserStake(validator.id);
            
            return (
              <div 
                key={validator.id} 
                className="validator-card"
                style={{ '--accent-color': validator.color }}
              >
                <div className="validator-header">
                  <div className="validator-image">
                    <img src={validator.image} alt={validator.name} />
                  </div>
                  <div className="validator-info">
                    <h3>{validator.name}</h3>
                    <span className="subnet-id">Subnet #{validator.id}</span>
                  </div>
                  <div className={`status-dot ${validator.status}`}></div>
                </div>

                <p className="validator-desc">{validator.description}</p>

                <div className="validator-metrics">
                  <div className="metric">
                    <span className="metric-value apy">{validator.apy}%</span>
                    <span className="metric-label">APY</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatNumber(validator.totalStaked)}</span>
                    <span className="metric-label">Staked</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{validator.performance}%</span>
                    <span className="metric-label">Uptime</span>
                  </div>
                </div>

                <div className="validator-stats">
                  <div className="stat-row">
                    <span>Delegators</span>
                    <span>{validator.delegators.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span>Min Stake</span>
                    <span>{formatTao(validator.minStake)} TAO</span>
                  </div>
                  <div className="stat-row">
                    <span>Commission</span>
                    <span>{validator.commission}%</span>
                  </div>
                  <div className="stat-row">
                    <span>Unbonding</span>
                    <span>{validator.unbondingDays} days</span>
                  </div>
                </div>

                {userStake > 0 && (
                  <div className="user-stake">
                    <span className="stake-label">Your Stake</span>
                    <span className="stake-amount">{userStake.toLocaleString()} TAO</span>
                  </div>
                )}

                <button 
                  className="stake-btn"
                  onClick={() => handleStake(validator)}
                >
                  {userStake > 0 ? 'Add Stake' : 'Stake Now'}
                </button>
              </div>
            );
          })}
        </div>

        {filteredValidators.length === 0 && activeTab === 'staked' && (
          <div className="empty-stakes">
            <p>You haven't staked on any subnet yet</p>
            <button className="btn btn-primary" onClick={() => setActiveTab('all')}>
              Explore Subnets
            </button>
          </div>
        )}
      </div>

      {/* Stake Modal */}
      {showStakeModal && selectedValidator && (
        <div className="modal-overlay" onClick={() => setShowStakeModal(false)}>
          <div className="stake-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-validator">
                <img src={selectedValidator.image} alt={selectedValidator.name} className="modal-image" />
                <div>
                  <h3>{selectedValidator.name}</h3>
                  <span className="subnet-tag">Subnet #{selectedValidator.id}</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowStakeModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="modal-stats">
              <div className="modal-stat">
                <span className="label">APY</span>
                <span className="value" style={{ color: selectedValidator.color }}>{selectedValidator.apy}%</span>
              </div>
              <div className="modal-stat">
                <span className="label">Total Staked</span>
                <span className="value">{formatNumber(selectedValidator.totalStaked)} TAO</span>
              </div>
              <div className="modal-stat">
                <span className="label">Min Stake</span>
                <span className="value">{formatTao(selectedValidator.minStake)} TAO</span>
              </div>
            </div>

            <div className="stake-input-group">
              <label>Amount to Stake</label>
              <div className="stake-input">
                <input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  disabled={staking}
                />
                <span className="token-label">TAO</span>
              </div>
              <div className="quick-amounts">
                <button onClick={() => setStakeAmount('100')} disabled={staking}>100</button>
                <button onClick={() => setStakeAmount('500')} disabled={staking}>500</button>
                <button onClick={() => setStakeAmount('1000')} disabled={staking}>1K</button>
                <button onClick={() => setStakeAmount('5000')} disabled={staking}>5K</button>
              </div>
            </div>

            <div className="stake-summary">
              <div className="summary-row">
                <span>Estimated Daily</span>
                <span className="earnings">+{((parseFloat(stakeAmount) || 0) * selectedValidator.apy / 100 / 365).toFixed(4)} TAO</span>
              </div>
              <div className="summary-row">
                <span>Estimated Monthly</span>
                <span className="earnings">+{((parseFloat(stakeAmount) || 0) * selectedValidator.apy / 100 / 12).toFixed(2)} TAO</span>
              </div>
              <div className="summary-row">
                <span>Estimated Yearly</span>
                <span className="earnings">+{((parseFloat(stakeAmount) || 0) * selectedValidator.apy / 100).toFixed(2)} TAO</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowStakeModal(false)} disabled={staking}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={confirmStake}
                disabled={!stakeAmount || parseFloat(stakeAmount) < parseInt(selectedValidator.minStake) / 1e9 || staking}
              >
                {staking ? 'Staking...' : 'Confirm Stake'}
              </button>
            </div>

            <p className="stake-notice">
              Staking has a {selectedValidator.unbondingDays}-day unbonding period. Commission: {selectedValidator.commission}%.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}