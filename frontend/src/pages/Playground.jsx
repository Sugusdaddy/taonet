import { useState, useEffect } from 'react';
import api from '../api';
import './Playground.css';

const REQUIRED_TASKS = 50000;

export default function Playground() {
  const [stats, setStats] = useState(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const data = await api.getStats();
      if (data) {
        setStats(data);
        setTasksCompleted(data.tasks?.completed || 0);
      }
    } catch (e) {
      console.error('Failed to load stats');
    }
  }

  const progress = Math.min((tasksCompleted / REQUIRED_TASKS) * 100, 100);
  const isActive = tasksCompleted >= REQUIRED_TASKS;

  const examples = [
    'How do I create a Solana program with Anchor?',
    'Explain SPL tokens and how to create one',
    'What is the difference between PDAs and keypairs?',
    'How do I handle errors in Anchor programs?'
  ];

  return (
    <div className="page playground-page">
      <div className="playground-container">
        {/* Sidebar */}
        <div className="playground-sidebar">
          <div className="sidebar-header">
            <div className="model-badge">
              <div className={`model-icon ${isActive ? 'active' : 'inactive'}`}>T</div>
              <div>
                <span className="model-name">SolanaGPT</span>
                <span className="model-version">{isActive ? 'Online' : 'Training...'}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section training-section">
            <h4>Neural Training Progress</h4>
            <div className="training-progress">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-stats">
                <span className="progress-current">{tasksCompleted.toLocaleString()}</span>
                <span className="progress-separator">/</span>
                <span className="progress-target">{REQUIRED_TASKS.toLocaleString()}</span>
                <span className="progress-label">tasks</span>
              </div>
              <p className="progress-description">
                {isActive 
                  ? 'SolanaGPT is fully trained and ready to answer your questions!'
                  : `SolanaGPT needs ${(REQUIRED_TASKS - tasksCompleted).toLocaleString()} more tasks to develop enough knowledge to answer questions.`
                }
              </p>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Specializations</h4>
            <div className="tags">
              <span className="tag">Solana</span>
              <span className="tag">Anchor</span>
              <span className="tag">Rust</span>
              <span className="tag">SPL Tokens</span>
              <span className="tag">NFTs</span>
              <span className="tag">DeFi</span>
            </div>
          </div>

          {stats && (
            <div className="sidebar-section">
              <h4>Network Stats</h4>
              <div className="sidebar-stats">
                <div className="sidebar-stat">
                  <span className="stat-value">{stats.knowledge?.count || 0}</span>
                  <span className="stat-label">Knowledge</span>
                </div>
                <div className="sidebar-stat">
                  <span className="stat-value">{stats.network?.onlineMiners || 0}</span>
                  <span className="stat-label">Miners</span>
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-footer">
            <p>Help train SolanaGPT by mining at /mine</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {!isActive ? (
            <div className="chat-inactive">
              <div className="inactive-content">
                <div className="brain-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
                    <path d="M9 21h6M10 17v4M14 17v4"/>
                    <path d="M12 6v4M10 8h4"/>
                  </svg>
                </div>
                <h2>SolanaGPT is Learning</h2>
                <p className="inactive-description">
                  Our decentralized AI is being trained by miners processing tasks on the TaoNet network. 
                  Once we reach {REQUIRED_TASKS.toLocaleString()} completed tasks, SolanaGPT will have enough 
                  collective knowledge to start answering your Solana development questions.
                </p>
                
                <div className="big-progress">
                  <div className="big-progress-bar">
                    <div 
                      className="big-progress-fill" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="big-progress-text">
                    <span className="percentage">{progress.toFixed(1)}%</span>
                    <span className="tasks">{tasksCompleted.toLocaleString()} / {REQUIRED_TASKS.toLocaleString()} tasks</span>
                  </div>
                </div>

                <div className="help-train">
                  <h3>Help Train SolanaGPT</h3>
                  <p>Start mining to contribute to the AI's knowledge base and earn rewards!</p>
                  <a href="/mine" className="btn-start-mining">
                    Start Mining
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </a>
                </div>

                <div className="coming-features">
                  <h4>Coming Soon</h4>
                  <ul>
                    {examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              <div className="message assistant">
                <div className="message-avatar">T</div>
                <div className="message-content">
                  <div className="message-text">
                    Hi! I'm SolanaGPT, trained on TaoNet's decentralized network. 
                    Ask me anything about Solana, Anchor, Rust, or Web3 development.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isActive && (
            <form className="chat-input-form">
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  placeholder="Ask about Solana development..."
                />
                <button type="submit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}