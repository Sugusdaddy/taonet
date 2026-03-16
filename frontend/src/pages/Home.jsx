import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './Home.css';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [jackpots, setJackpots] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const [statsData, jackpotsData, activityData] = await Promise.all([
      api.getStats(),
      api.getJackpots(),
      api.getActivity(15)
    ]);
    
    if (statsData) setStats(statsData);
    if (jackpotsData?.jackpots) setJackpots(jackpotsData.jackpots);
    if (activityData?.activities) setActivity(activityData.activities);
  }

  const activityIcons = {
    miner_joined: { icon: '+', cls: 'join' },
    task_completed: { icon: '>', cls: 'task' },
    reward_earned: { icon: '$', cls: 'reward' },
    jackpot_won: { icon: '*', cls: 'jackpot' },
    level_up: { icon: '^', cls: 'level' }
  };

  const renderActivity = (a, i) => {
    const iconData = activityIcons[a.type] || { icon: '?', cls: 'task' };
    let message = '';
    switch (a.type) {
      case 'miner_joined': message = <><strong>{a.miner}</strong> joined the network</>; break;
      case 'task_completed': message = <><strong>{a.miner}</strong> completed a task</>; break;
      case 'reward_earned': message = <><strong>{a.miner}</strong> earned <strong>{a.data?.amount || 0}</strong> tokens</>; break;
      case 'jackpot_won': message = <><strong>{a.miner}</strong> hit a <strong>{a.data?.jackpotType}</strong> jackpot!</>; break;
      case 'level_up': message = <><strong>{a.miner}</strong> reached level <strong>{a.data?.level}</strong></>; break;
      default: message = `${a.miner} did something`;
    }
    
    return (
      <div key={i} className="activity-item">
        <div className={`activity-icon ${iconData.cls}`}>{iconData.icon}</div>
        <div className="activity-content">
          <div className="activity-text">{message}</div>
          <div className="activity-time">{api.timeAgo(a.time)}</div>
        </div>
      </div>
    );
  };

  const tiers = [
    { name: 'Bronze', mult: '1x', req: 'Any amount', cls: 'bronze' },
    { name: 'Silver', mult: '1.25x', req: '10K tokens', cls: 'silver' },
    { name: 'Gold', mult: '1.5x', req: '100K tokens', cls: 'gold' },
    { name: 'Platinum', mult: '2x', req: '1M tokens', cls: 'platinum' },
    { name: 'Diamond', mult: '3x', req: '10M tokens', cls: 'diamond' }
  ];

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <span className="hero-badge">Built on Solana</span>
          <h1 className="hero-title">
            Earn Crypto<br /><span className="accent">Running AI</span>
          </h1>
          <p className="hero-text">
            Your computer processes AI tasks. You get paid instantly.
            No complex setup. No minimum requirements.
          </p>
          <div className="hero-buttons">
            <Link to="/mine" className="btn btn-primary btn-lg">Start Mining</Link>
            <a href="#how" className="btn btn-secondary btn-lg">How It Works</a>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="section section-alt">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats?.network?.totalMiners || 0}</div>
              <div className="stat-label">Total Miners</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.network?.onlineMiners || 0}</div>
              <div className="stat-label">Online Now</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.tasks?.completed || 0}</div>
              <div className="stat-label">Tasks Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{api.formatNumber(stats?.rewards?.totalDistributed || 0)}</div>
              <div className="stat-label">Tokens Paid</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Activity */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Live Activity</h2>
            <p className="section-subtitle">Real-time network activity</p>
          </div>
          
          <div className="activity-container">
            <div className="activity-feed">
              {activity.length > 0 ? (
                activity.map(renderActivity)
              ) : (
                <div className="activity-empty">
                  <p>Waiting for network activity...</p>
                  <p className="small">Be the first to join!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-alt" id="how">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Start earning in 3 simple steps</p>
          </div>
          
          <div className="grid-3">
            <div className="card step-card">
              <div className="step-number">1</div>
              <h3>Connect Wallet</h3>
              <p>Connect your Phantom wallet to get started. Takes 10 seconds.</p>
            </div>
            <div className="card step-card">
              <div className="step-number">2</div>
              <h3>Start Mining</h3>
              <p>Click "Start Mining" and your browser will begin processing AI tasks.</p>
            </div>
            <div className="card step-card">
              <div className="step-number">3</div>
              <h3>Earn Tokens</h3>
              <p>Get paid instantly for each completed task. Watch your balance grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Earning Tiers</h2>
            <p className="section-subtitle">Hold tokens to boost your earnings</p>
          </div>
          
          <div className="tiers-grid">
            {tiers.map(tier => (
              <div key={tier.cls} className={`tier-card tier-${tier.cls}`}>
                <span className="tier-name">{tier.name}</span>
                <span className="tier-mult">{tier.mult}</span>
                <span className="tier-req">{tier.req}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jackpots */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Jackpots</h2>
            <p className="section-subtitle">Random tasks trigger bonus payouts</p>
          </div>
          
          <div className="grid-4">
            {['mini', 'regular', 'mega', 'ultra'].map(type => {
              const jp = jackpots.find(j => j.type === type) || {};
              const mults = { mini: 32, regular: 144, mega: 699, ultra: 5163 };
              return (
                <div key={type} className={`jackpot-card jackpot-${type}`}>
                  <span className="jackpot-type">{type}</span>
                  <span className="jackpot-mult">{jp.multiplier || mults[type]}x</span>
                  <span className="jackpot-info">
                    {jp.tasksUntilTrigger ? `${jp.tasksUntilTrigger} tasks left` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-box">
            <h2 className="section-title">Ready to Start?</h2>
            <p className="text-secondary mt-sm mb-lg">Join the network and start earning today</p>
            <Link to="/mine" className="btn btn-primary btn-lg">Start Mining</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
