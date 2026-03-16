import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useMining } from '../context/MiningContext';
import api from '../api';
import './Mine.css';

export default function Mine() {
  const { wallet, miner, isConnected, connect, register } = useWallet();
  const { 
    isMining, 
    modelStatus, 
    modelProgress, 
    currentTask, 
    streamingResponse, 
    taskMetrics,
    sessionStats, 
    logs,
    lastProof,
    startMining, 
    stopMining 
  } = useMining();
  
  const [minerName, setMinerName] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    if (!minerName.trim()) return;
    setRegistering(true);
    try {
      await register(minerName);
    } catch (err) {
      console.error('Register error:', err);
    }
    setRegistering(false);
  };

  const formatTime = (ms) => {
    if (!ms) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const elapsedTime = sessionStats.startTime ? Date.now() - sessionStats.startTime : 0;

  return (
    <main className="mine-page">
      <div className="container">
        {/* Header */}
        <div className="mine-header">
          <div>
            <h1>AI Mining</h1>
            <p className="text-secondary">Run inference tasks and earn TAO</p>
          </div>
          {isMining && (
            <div className="live-badge">
              <span className="live-dot"></span>
              MINING
            </div>
          )}
        </div>

        <div className="mine-layout">
          {/* Sidebar - Setup */}
          <aside className="mine-sidebar">
            <div className="card">
              <h3 className="card-title mb-lg">Setup</h3>
              
              {/* Step 1: Connect */}
              <div className={`setup-step ${isConnected ? 'done' : ''}`}>
                <div className="step-indicator">{isConnected ? '1' : '1'}</div>
                <div className="step-content">
                  <strong>Connect Wallet</strong>
                  {!isConnected ? (
                    <button onClick={connect} className="btn btn-primary btn-sm mt-sm">
                      Connect Phantom
                    </button>
                  ) : (
                    <p className="text-sm text-secondary">{api.shortAddress(wallet)}</p>
                  )}
                </div>
              </div>

              {/* Step 2: Register */}
              <div className={`setup-step ${miner ? 'done' : ''} ${!isConnected ? 'disabled' : ''}`}>
                <div className="step-indicator">2</div>
                <div className="step-content">
                  <strong>Register Miner</strong>
                  {!miner && isConnected ? (
                    <div className="mt-sm">
                      <input
                        type="text"
                        placeholder="Miner name"
                        value={minerName}
                        onChange={(e) => setMinerName(e.target.value)}
                        className="input-sm"
                      />
                      <button 
                        onClick={handleRegister} 
                        disabled={!minerName.trim() || registering}
                        className="btn btn-primary btn-sm mt-sm"
                      >
                        {registering ? 'Registering...' : 'Register'}
                      </button>
                    </div>
                  ) : miner ? (
                    <p className="text-sm text-secondary">{miner.name}</p>
                  ) : null}
                </div>
              </div>

              {/* Step 3: Start */}
              <div className={`setup-step ${isMining ? 'done' : ''} ${!miner ? 'disabled' : ''}`}>
                <div className="step-indicator">3</div>
                <div className="step-content">
                  <strong>Start Mining</strong>
                  {miner && (
                    <div className="mt-sm">
                      {!isMining ? (
                        <button onClick={startMining} className="btn btn-primary btn-sm">
                          {modelStatus === 'loading' ? `Loading ${modelProgress}%` : 'Start Mining'}
                        </button>
                      ) : (
                        <button onClick={stopMining} className="btn btn-danger btn-sm">
                          Stop Mining
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Session Stats */}
            {isMining && (
              <div className="card mt-lg">
                <h3 className="card-title mb-md">Session Stats</h3>
                <div className="stats-mini">
                  <div className="stat-mini">
                    <span className="stat-mini-value">{formatTime(elapsedTime)}</span>
                    <span className="stat-mini-label">Time</span>
                  </div>
                  <div className="stat-mini">
                    <span className="stat-mini-value">{sessionStats.tasksCompleted}</span>
                    <span className="stat-mini-label">Tasks</span>
                  </div>
                  <div className="stat-mini">
                    <span className="stat-mini-value">{sessionStats.tokensGenerated}</span>
                    <span className="stat-mini-label">Tokens</span>
                  </div>
                  <div className="stat-mini highlight">
                    <span className="stat-mini-value">{sessionStats.taoEarned}</span>
                    <span className="stat-mini-label">TAO</span>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Main - Activity */}
          <div className="mine-main">
            {/* Model Loading */}
            {modelStatus === 'loading' && (
              <div className="card model-loading">
                <div className="loading-header">
                  <div className="spinner"></div>
                  <span>Loading AI Model</span>
                </div>
                <div className="progress mt-md">
                  <div className="progress-bar" style={{ width: `${modelProgress}%` }}></div>
                </div>
                <p className="text-sm text-secondary mt-sm">
                  Downloading Llama 3.2 1B (~500MB). Cached after first load.
                </p>
              </div>
            )}

            {/* Current Task */}
            {currentTask && (
              <div className="card glow-card task-card">
                <div className="task-header">
                  <span className="task-badge">Processing</span>
                  <span className="task-metrics">
                    {taskMetrics.tokens} tokens | {taskMetrics.tokensPerSec} tok/s
                  </span>
                </div>
                
                <div className="task-section">
                  <label>INPUT</label>
                  <p className="task-prompt">{currentTask.prompt}</p>
                </div>
                
                <div className="task-section">
                  <label>OUTPUT</label>
                  <div className="task-response">
                    {streamingResponse}
                    <span className="cursor">|</span>
                  </div>
                </div>
              </div>
            )}

            {/* Last Proof */}
            {lastProof && !currentTask && (
              <div className="card proof-card">
                <div className="proof-header">
                  <span className="proof-badge">Proof #{lastProof.blockNumber}</span>
                  <span className="text-accent">Verified</span>
                </div>
                <div className="proof-hash">
                  <label>Block Hash</label>
                  <code>{lastProof.blockHash}</code>
                </div>
              </div>
            )}

            {/* Waiting State */}
            {isMining && !currentTask && modelStatus === 'ready' && (
              <div className="card waiting-card">
                <div className="waiting-content">
                  <div className="waiting-pulse"></div>
                  <h3>Waiting for Tasks</h3>
                  <p className="text-secondary">Connected and ready. Tasks will appear automatically.</p>
                </div>
              </div>
            )}

            {/* Not Mining */}
            {!isMining && modelStatus !== 'loading' && (
              <div className="card intro-card">
                <h3>How Mining Works</h3>
                <ol>
                  <li>Your browser downloads a 500MB AI model (Llama 3.2 1B)</li>
                  <li>Tasks are sent from the network via WebSocket</li>
                  <li>Your GPU processes inference locally using WebGPU</li>
                  <li>Responses are verified and you earn TAO rewards</li>
                  <li>A cryptographic proof is created for each task</li>
                </ol>
                <p className="mt-md text-secondary">
                  Mining continues even when you navigate to other pages.
                </p>
              </div>
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div className="card mt-lg">
                <h3 className="card-title mb-md">Activity Log</h3>
                <div className="logs-container">
                  {logs.slice().reverse().map((log, i) => (
                    <div key={i} className={`log-entry log-${log.type}`}>
                      <span className="log-time">{log.time}</span>
                      <span className="log-msg">{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
