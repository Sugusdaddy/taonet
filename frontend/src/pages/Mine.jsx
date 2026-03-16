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
    gpuInfo,
    loadModel,
    startMining, 
    stopMining,
    checkGPUSupport
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

  // GPU status component
  const GPUStatus = () => {
    if (modelStatus === 'checking') {
      return (
        <div className="gpu-status checking">
          <div className="gpu-icon spinning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
          </div>
          <span>Checking GPU compatibility...</span>
        </div>
      );
    }
    
    if (modelStatus === 'no-gpu' || !gpuInfo?.supported) {
      return (
        <div className="gpu-status error">
          <div className="gpu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="gpu-info">
            <span className="gpu-title">No Compatible GPU Detected</span>
            <span className="gpu-detail">{gpuInfo?.reason || 'WebGPU not available'}</span>
          </div>
          <button className="retry-btn" onClick={checkGPUSupport}>
            Retry
          </button>
        </div>
      );
    }
    
    if (gpuInfo?.supported) {
      return (
        <div className="gpu-status success">
          <div className="gpu-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="gpu-info">
            <span className="gpu-title">GPU Ready</span>
            <span className="gpu-detail">{gpuInfo.vendor} {gpuInfo.device || gpuInfo.architecture}</span>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // GPU requirements help
  const GPUHelp = () => (
    <div className="gpu-help">
      <h4>WebGPU Requirements</h4>
      <ul>
        <li><strong>Chrome 113+</strong> or <strong>Edge 113+</strong> (recommended)</li>
        <li>Firefox Nightly with <code>dom.webgpu.enabled</code></li>
        <li>Dedicated GPU (NVIDIA, AMD, Intel Arc)</li>
        <li>Updated graphics drivers</li>
      </ul>
      <div className="gpu-help-links">
        <a href="https://webgpureport.org" target="_blank" rel="noopener">Check WebGPU Support</a>
        <a href="https://developer.chrome.com/docs/web-platform/webgpu" target="_blank" rel="noopener">WebGPU Docs</a>
      </div>
    </div>
  );

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

            {/* GPU Status */}
            <GPUStatus />
            
            {modelStatus === 'no-gpu' && <GPUHelp />}

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
                  {isMining && <span className="step-status done">Mining...</span>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="setup-actions">
              {step === 1 && (
                <button className="btn-primary" onClick={connect}>
                  Connect Wallet
                </button>
              )}
              
              {step === 2 && (
                <div className="register-form">
                  <input
                    type="text"
                    placeholder="Miner name"
                    value={minerName}
                    onChange={e => setMinerName(e.target.value)}
                    maxLength={20}
                  />
                  <button 
                    className="btn-primary" 
                    onClick={handleRegister}
                    disabled={!minerName.trim() || registering}
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </button>
                </div>
              )}
              
              {step === 3 && (
                <>
                  {!isMining ? (
                    <button 
                      className="btn-primary btn-start"
                      onClick={startMining}
                      disabled={modelStatus === 'loading' || modelStatus === 'no-gpu'}
                    >
                      {modelStatus === 'loading' ? (
                        <>Loading Model ({modelProgress}%)...</>
                      ) : modelStatus === 'no-gpu' ? (
                        <>GPU Required</>
                      ) : modelStatus === 'ready' ? (
                        <>Start Mining</>
                      ) : (
                        <>Load Model & Start</>
                      )}
                    </button>
                  ) : (
                    <button className="btn-danger" onClick={stopMining}>
                      Stop Mining
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Model Loading Progress */}
            {modelStatus === 'loading' && (
              <div className="model-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${modelProgress}%` }} />
                </div>
                <span>{modelProgress}% - Downloading model weights...</span>
              </div>
            )}
          </div>

          {/* Right - Mining Dashboard */}
          <div className="mining-dashboard">
            {/* Session Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Session Time</span>
                <span className="stat-value">{formatTime(elapsedTime)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tasks Completed</span>
                <span className="stat-value">{sessionStats.tasksCompleted}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tokens Generated</span>
                <span className="stat-value">{sessionStats.tokensGenerated.toLocaleString()}</span>
              </div>
              <div className="stat-card highlight">
                <span className="stat-label">TAO Earned</span>
                <span className="stat-value">{sessionStats.taoEarned.toFixed(4)}</span>
              </div>
            </div>

            {/* Current Task */}
            {currentTask && (
              <div className="current-task">
                <div className="task-header">
                  <span className="task-badge">Processing Task</span>
                  <span className="task-metrics">
                    {taskMetrics.tokens} tokens | {taskMetrics.tokensPerSec.toFixed(1)} t/s
                  </span>
                </div>
                <div className="task-prompt">{currentTask.prompt}</div>
                {streamingResponse && (
                  <div className="task-response">
                    <pre>{streamingResponse}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Miner Info */}
            {miner && (
              <div className="miner-info">
                <div className="miner-header">
                  <span className="miner-name">{miner.name}</span>
                  <span className="miner-level">Lv.{miner.level || 1}</span>
                </div>
                <div className="miner-stats">
                  <span>XP: {miner.xp || 0}</span>
                  <span>Tasks: {miner.stats?.completedTasks || 0}</span>
                </div>
              </div>
            )}

            {/* Logs */}
            <div className="logs-panel">
              <div className="logs-header">
                <span>Activity Log</span>
                <span className="log-count">{logs.length} entries</span>
              </div>
              <div className="logs-content">
                {logs.length === 0 ? (
                  <div className="log-empty">Waiting for activity...</div>
                ) : (
                  logs.slice().reverse().map((log, i) => (
                    <div key={i} className={`log-entry log-${log.type}`}>
                      <span className="log-time">{log.time}</span>
                      <span className="log-msg">{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Last Proof */}
            {lastProof && (
              <div className="last-proof">
                <span>Last Proof: {lastProof.id?.slice(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
