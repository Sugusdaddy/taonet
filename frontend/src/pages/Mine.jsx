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
      console.error(err);
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

  // Determine current step
  const step = !isConnected ? 1 : !miner ? 2 : 3;

  return (
    <main className="mine-page">
      <div className="container">
        <div className="mine-grid">
          {/* Left - Setup Panel */}
          <div className="setup-panel">
            <div className="panel-header">
              <h2>Mine TAO</h2>
              <p>Contribute GPU compute, earn rewards</p>
            </div>

            {/* Progress Steps */}
            <div className="setup-progress">
              <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                <div className="step-marker">
                  {step > 1 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : '1'}
                </div>
                <div className="step-info">
                  <span className="step-title">Connect Wallet</span>
                  {step === 1 && <span className="step-status">Required</span>}
                  {step > 1 && <span className="step-status done">{api.shortAddress(wallet)}</span>}
                </div>
              </div>
              
              <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
                <div className="step-marker">
                  {step > 2 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : '2'}
                </div>
                <div className="step-info">
                  <span className="step-title">Register Miner</span>
                  {step === 2 && <span className="step-status">Required</span>}
                  {step > 2 && <span className="step-status done">{miner?.name}</span>}
                </div>
              </div>
              
              <div className={`progress-step ${step >= 3 ? 'active' : ''} ${isMining ? 'done' : ''}`}>
                <div className="step-marker">
                  {isMining ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : '3'}
                </div>
                <div className="step-info">
                  <span className="step-title">Start Mining</span>
                  {step === 3 && !isMining && <span className="step-status">Ready</span>}
                  {isMining && <span className="step-status done">Active</span>}
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="setup-action">
              {step === 1 && (
                <button onClick={connect} className="btn btn-primary w-full">
                  Connect Phantom Wallet
                </button>
              )}
              
              {step === 2 && (
                <div className="register-form">
                  <input
                    type="text"
                    placeholder="Enter miner name"
                    value={minerName}
                    onChange={(e) => setMinerName(e.target.value)}
                  />
                  <button 
                    onClick={handleRegister}
                    disabled={!minerName.trim() || registering}
                    className="btn btn-primary w-full"
                  >
                    {registering ? 'Registering...' : 'Register Miner'}
                  </button>
                </div>
              )}
              
              {step === 3 && (
                <>
                  {!isMining ? (
                    <button 
                      onClick={startMining}
                      disabled={modelStatus === 'loading'}
                      className="btn btn-primary w-full"
                    >
                      {modelStatus === 'loading' ? `Loading Model ${modelProgress}%` : 'Start Mining'}
                    </button>
                  ) : (
                    <button onClick={stopMining} className="btn btn-danger w-full">
                      Stop Mining
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Session Stats */}
            {isMining && (
              <div className="session-stats">
                <div className="session-stat">
                  <span className="stat-label">Time</span>
                  <span className="stat-value">{formatTime(elapsedTime)}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value">{sessionStats.tasksCompleted}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Tokens</span>
                  <span className="stat-value">{sessionStats.tokensGenerated}</span>
                </div>
                <div className="session-stat highlight">
                  <span className="stat-label">TAO</span>
                  <span className="stat-value">{sessionStats.taoEarned}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right - Activity Panel */}
          <div className="activity-panel">
            {/* Model Loading */}
            {modelStatus === 'loading' && (
              <div className="loading-card">
                <div className="loading-header">
                  <div className="loading-spinner"></div>
                  <div>
                    <h3>Downloading AI Model</h3>
                    <p>Llama 3.2 1B - {modelProgress}% complete</p>
                  </div>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${modelProgress}%` }}></div>
                </div>
                <p className="loading-note">
                  ~500MB download. Cached in browser after first load.
                </p>
              </div>
            )}

            {/* Current Task */}
            {currentTask && (
              <div className="task-card">
                <div className="task-header">
                  <div className="task-badge">
                    <span className="badge-dot"></span>
                    Processing
                  </div>
                  <span className="task-metrics">
                    {taskMetrics.tokens} tokens / {taskMetrics.tokensPerSec} tok/s
                  </span>
                </div>
                
                <div className="task-content">
                  <div className="task-section">
                    <label>Input</label>
                    <p>{currentTask.prompt}</p>
                  </div>
                  
                  <div className="task-section">
                    <label>Output</label>
                    <div className="task-output">
                      {streamingResponse}
                      <span className="cursor">|</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Last Proof */}
            {lastProof && !currentTask && (
              <div className="proof-card">
                <div className="proof-header">
                  <span className="proof-number">Proof #{lastProof.blockNumber}</span>
                  <span className="proof-verified">Verified</span>
                </div>
                <div className="proof-hash">
                  <label>Block Hash</label>
                  <code>{lastProof.blockHash}</code>
                </div>
              </div>
            )}

            {/* Waiting State */}
            {isMining && !currentTask && modelStatus === 'ready' && (
              <div className="waiting-card">
                <div className="waiting-pulse"></div>
                <h3>Waiting for tasks</h3>
                <p>Connected and ready. Tasks arrive automatically.</p>
              </div>
            )}

            {/* Not Mining */}
            {!isMining && modelStatus !== 'loading' && (
              <div className="info-card">
                <h3>How it works</h3>
                <ul>
                  <li>Your browser downloads a 500MB AI model (Llama 3.2)</li>
                  <li>Tasks are sent via WebSocket from the network</li>
                  <li>Your GPU runs inference locally using WebGPU</li>
                  <li>Responses are verified and you earn TAO rewards</li>
                  <li>A cryptographic proof is created for each task</li>
                </ul>
                <p className="info-note">
                  Mining continues even when navigating to other pages.
                </p>
              </div>
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div className="logs-card">
                <h4>Activity Log</h4>
                <div className="logs-list">
                  {logs.slice().reverse().slice(0, 10).map((log, i) => (
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
