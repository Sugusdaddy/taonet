import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { useMining } from '../context/MiningContext';
import api from '../api';
import './Mine.css';

export default function Mine() {
  const { wallet, isConnected, connect, miner } = useWallet();
  const { 
    isMining, startMining, stopMining, 
    currentTask, taskOutput, 
    sessionStats, logs,
    gpuInfo, checkGPUSupport, modelLoading, modelProgress
  } = useMining();
  
  const [minerName, setMinerName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const logsRef = useRef(null);

  useEffect(() => {
    checkGPUSupport();
  }, []);

  useEffect(() => {
    if (miner) setIsRegistered(true);
  }, [miner]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRegister = async () => {
    if (!minerName.trim()) return;
    setRegistering(true);
    const result = await api.registerMiner(wallet, minerName);
    if (result?.miner) {
      setIsRegistered(true);
    }
    setRegistering(false);
  };

  const getStep = () => {
    if (!isConnected) return 1;
    if (!isRegistered) return 2;
    return 3;
  };

  const step = getStep();

  return (
    <div className="page mine-page">
      <div className="container">
        <div className="mine-grid">
          {/* Setup Panel */}
          <div className="setup-panel">
            <div className="panel-header">
              <h2>Start Mining</h2>
              <p>Earn TAO by running AI tasks</p>
            </div>

            {/* Progress Steps */}
            <div className="setup-steps">
              <div className={`setup-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
                <div className="step-marker">
                  {step > 1 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : '1'}
                </div>
                <div className="step-info">
                  <span className="step-title">Connect Wallet</span>
                  <span className="step-status">{step > 1 ? 'Connected' : 'Phantom required'}</span>
                </div>
              </div>

              <div className={`setup-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
                <div className="step-marker">
                  {step > 2 ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : '2'}
                </div>
                <div className="step-info">
                  <span className="step-title">Register Miner</span>
                  <span className="step-status">{step > 2 ? 'Registered' : 'Choose a name'}</span>
                </div>
              </div>

              <div className={`setup-step ${step >= 3 ? 'active' : ''} ${isMining ? 'done' : ''}`}>
                <div className="step-marker">
                  {isMining ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : '3'}
                </div>
                <div className="step-info">
                  <span className="step-title">Start Mining</span>
                  <span className="step-status">{isMining ? 'Mining...' : 'Ready to mine'}</span>
                </div>
              </div>
            </div>

            {/* GPU Status */}
            {gpuInfo && (
              <div className={`gpu-status ${gpuInfo.supported ? 'success' : 'error'}`}>
                <svg className="gpu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                </svg>
                <div className="gpu-info">
                  <span className="gpu-title">
                    {gpuInfo.supported ? 'WebGPU Ready' : 'WebGPU Not Available'}
                  </span>
                  <span className="gpu-detail">
                    {gpuInfo.supported ? gpuInfo.adapter || 'GPU detected' : 'Chrome 113+ required'}
                  </span>
                </div>
              </div>
            )}

            {/* Action Area */}
            <div className="setup-action">
              {step === 1 && (
                <button onClick={connect} className="btn btn-primary btn-lg full-width">
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
                    maxLength={20}
                  />
                  <button 
                    onClick={handleRegister} 
                    className="btn btn-primary full-width"
                    disabled={!minerName.trim() || registering}
                  >
                    {registering ? 'Registering...' : 'Register Miner'}
                  </button>
                </div>
              )}

              {step === 3 && (
                <>
                  {modelLoading ? (
                    <div className="model-loading">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${modelProgress}%` }}></div>
                      </div>
                      <span>Loading AI model... {modelProgress}%</span>
                    </div>
                  ) : isMining ? (
                    <button onClick={stopMining} className="btn btn-danger btn-lg full-width">
                      Stop Mining
                    </button>
                  ) : (
                    <button 
                      onClick={startMining} 
                      className="btn btn-primary btn-lg full-width"
                      disabled={!gpuInfo?.supported}
                    >
                      Start Mining
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Session Stats */}
            {isMining && (
              <div className="session-stats">
                <div className="session-stat">
                  <span className="stat-label">Tasks</span>
                  <span className="stat-value">{sessionStats.tasks}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Earned</span>
                  <span className="stat-value highlight">{sessionStats.earned.toFixed(4)}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Tokens</span>
                  <span className="stat-value">{sessionStats.tokens}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Time</span>
                  <span className="stat-value">{sessionStats.time}</span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Panel */}
          <div className="activity-panel">
            {isMining ? (
              <>
                {/* Current Task */}
                {currentTask ? (
                  <div className="task-card active">
                    <div className="task-header">
                      <div className="task-badge">
                        <span className="pulse-dot"></span>
                        Processing Task
                      </div>
                      <span className="task-id">#{currentTask.id?.slice(-8)}</span>
                    </div>
                    <div className="task-content">
                      <div className="task-prompt">
                        <label>Prompt</label>
                        <p>{currentTask.prompt}</p>
                      </div>
                      <div className="task-output">
                        <label>AI Response</label>
                        <div className="output-text">
                          {taskOutput || <span className="typing">Generating...</span>}
                          <span className="cursor">|</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="waiting-card">
                    <div className="waiting-icon">
                      <div className="pulse-ring"></div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <h3>Waiting for task...</h3>
                    <p>Your miner is connected and ready</p>
                  </div>
                )}

                {/* Activity Log */}
                <div className="logs-card">
                  <h4>Activity Log</h4>
                  <div className="logs-list" ref={logsRef}>
                    {logs.map((log, i) => (
                      <div key={i} className={`log-entry ${log.type}`}>
                        <span className="log-time">{log.time}</span>
                        <span className="log-msg">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="info-card">
                <h3>How Mining Works</h3>
                <ul>
                  <li>Your browser downloads a small AI model (~500MB)</li>
                  <li>Tasks are assigned from the TaoNet network</li>
                  <li>Your GPU processes real AI inference</li>
                  <li>Completed tasks earn TAO tokens instantly</li>
                  <li>All proofs are verified and anchored to Solana</li>
                </ul>
                <div className="requirements">
                  <h4>Requirements</h4>
                  <ul>
                    <li>Chrome 113+ or Edge 113+</li>
                    <li>GPU with WebGPU support</li>
                    <li>Phantom wallet</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
