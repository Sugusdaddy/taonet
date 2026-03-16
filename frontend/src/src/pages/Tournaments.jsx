import { useState, useEffect } from 'react';
import api from '../api';
import './Tournaments.css';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const data = await api.getTournaments();
    if (data?.tournaments) setTournaments(data.tournaments);
  }

  const getStatus = (t) => {
    const now = Date.now();
    const start = new Date(t.startTime).getTime();
    const end = new Date(t.endTime).getTime();
    
    if (now < start) return { status: 'upcoming', text: 'Upcoming' };
    if (now > end) return { status: 'ended', text: 'Ended' };
    return { status: 'active', text: 'Active' };
  };

  return (
    <main className="tournaments-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Tournaments</h1>
          <p className="page-subtitle">Compete for bonus prize pools</p>
        </div>

        {tournaments.length > 0 ? (
          <div className="tournaments-list">
            {tournaments.map((t, i) => {
              const { status, text } = getStatus(t);
              const timeLeft = status === 'active' 
                ? Math.floor((new Date(t.endTime).getTime() - Date.now()) / 1000 / 60 / 60)
                : 0;

              return (
                <div key={i} className="tournament-card">
                  <div className="tournament-header">
                    <div>
                      <h2 className="tournament-title">{t.name}</h2>
                      <p className="text-secondary">{t.description || 'Compete for prizes'}</p>
                    </div>
                    <span className={`tournament-status status-${status}`}>{text}</span>
                  </div>
                  
                  <div className="tournament-info">
                    <div className="info-item">
                      <div className="info-value">{api.formatNumber(t.prizePool)}</div>
                      <div className="info-label">Prize Pool</div>
                    </div>
                    <div className="info-item">
                      <div className="info-value">{t.participants || 0}</div>
                      <div className="info-label">Participants</div>
                    </div>
                    <div className="info-item">
                      <div className="info-value">{status === 'active' ? `${timeLeft}h` : '-'}</div>
                      <div className="info-label">Time Left</div>
                    </div>
                    <div className="info-item">
                      <div className="info-value">#{t.yourRank || '-'}</div>
                      <div className="info-label">Your Rank</div>
                    </div>
                  </div>
                  
                  {t.prizes?.length > 0 && (
                    <div className="prize-distribution">
                      <h4>Prize Distribution</h4>
                      {t.prizes.map((prize, idx) => (
                        <div key={idx} className="prize-row">
                          <span className={`prize-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                            #{idx + 1}
                          </span>
                          <span className="prize-amount">{api.formatNumber(prize)} tokens</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {status === 'active' && (
                    <a href="/mine" className="btn btn-primary w-full">Start Mining to Compete</a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No Active Tournaments</h3>
            <p>Check back later for upcoming competitions</p>
          </div>
        )}
      </div>
    </main>
  );
}
