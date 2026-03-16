import { useState, useEffect } from 'react';
import api from '../api';
import './Rewards.css';

export default function Rewards() {
  const [jackpots, setJackpots] = useState([]);

  useEffect(() => {
    loadJackpots();
  }, []);

  async function loadJackpots() {
    const data = await api.getJackpots();
    if (data?.jackpots) setJackpots(data.jackpots);
  }

  const baseRewards = [
    { label: 'Base Task Reward', value: '10 tokens', desc: 'Every completed task' },
    { label: 'Quality Bonus', value: '+5 tokens', desc: '80%+ quality score' },
    { label: 'Speed Bonus', value: '+3 tokens', desc: 'Response under 30s' },
    { label: 'Streak Bonus', value: '+2%/day', desc: 'Max 20% at 10 days' },
  ];

  const tiers = [
    { name: 'Bronze', req: 'Any', mult: '1.0x', color: 'bronze' },
    { name: 'Silver', req: '10K', mult: '1.25x', color: 'silver' },
    { name: 'Gold', req: '100K', mult: '1.5x', color: 'gold' },
    { name: 'Platinum', req: '1M', mult: '2.0x', color: 'platinum' },
    { name: 'Diamond', req: '10M', mult: '3.0x', color: 'diamond' },
  ];

  const jackpotDefaults = {
    mini: { mult: 32, tasks: 50 },
    regular: { mult: 144, tasks: 500 },
    mega: { mult: 699, tasks: 5000 },
    ultra: { mult: 5163, tasks: 50000 },
  };

  return (
    <main className="rewards-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Rewards</h1>
          <p className="page-subtitle">How you earn tokens on TaoNet</p>
        </div>

        {/* Base Rewards */}
        <section className="section">
          <h2 className="section-title">Base Rewards</h2>
          <div className="grid-2">
            {baseRewards.map((r, i) => (
              <div key={i} className="reward-card">
                <div className="reward-value">{r.value}</div>
                <div className="reward-label">{r.label}</div>
                <div className="reward-desc">{r.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tier Multipliers */}
        <section className="section">
          <h2 className="section-title">Tier Multipliers</h2>
          <p className="section-subtitle">Hold tokens to increase your earning rate</p>
          
          <div className="table-container card">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Tokens Required</th>
                  <th>Multiplier</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.name}>
                    <td>
                      <span className={`badge badge-${tier.color}`}>{tier.name}</span>
                    </td>
                    <td>{tier.req}</td>
                    <td className={`mult mult-${tier.color}`}>{tier.mult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Jackpots */}
        <section className="section">
          <h2 className="section-title">Jackpots</h2>
          <p className="section-subtitle">Random tasks trigger massive bonus payouts</p>
          
          <div className="grid-4">
            {['mini', 'regular', 'mega', 'ultra'].map(type => {
              const jp = jackpots.find(j => j.type === type) || {};
              const defaults = jackpotDefaults[type];
              return (
                <div key={type} className={`jackpot-card jackpot-${type}`}>
                  <span className="jackpot-type">{type}</span>
                  <span className="jackpot-mult">{jp.multiplier || defaults.mult}x</span>
                  <span className="jackpot-trigger">Every {defaults.tasks} tasks</span>
                  <span className="jackpot-status">
                    {jp.tasksUntilTrigger ? `${jp.tasksUntilTrigger} left` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bonuses */}
        <section className="section">
          <h2 className="section-title">Additional Bonuses</h2>
          
          <div className="grid-3">
            <div className="card bonus-card">
              <h3>Referral Bonus</h3>
              <p className="bonus-value">10%</p>
              <p className="bonus-desc">Earn 10% of everything your referrals earn, forever</p>
            </div>
            <div className="card bonus-card">
              <h3>Tournament Prizes</h3>
              <p className="bonus-value">100K+</p>
              <p className="bonus-desc">Weekly tournaments with massive prize pools</p>
            </div>
            <div className="card bonus-card">
              <h3>Achievement XP</h3>
              <p className="bonus-value">30 badges</p>
              <p className="bonus-desc">Unlock achievements for bonus XP and rewards</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
