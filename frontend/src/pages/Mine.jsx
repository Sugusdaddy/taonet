import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Mine.css';

// WebLLM for real AI inference
let webllm = null;
let engine = null;

export default function Mine() {
  const { wallet, miner, connect, registerMiner, isConnected } = useWallet();
  const [minerName, setMinerName] = useState('');
  const [mining, setMining] = useState(false);
  const [stats, setStats] = useState({ tasks: 0, tokens: 0, time: 0, tokensGenerated: 0 });
  const [logs, setLogs] = useState([]);
  const [modelStatus, setModelStatus] = useState({ loading: false, ready: false, progress: 0, error: null });
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const addLog = useCallback((type, message) => {
    setLogs(prev => [{
      type,
      message,
      time: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 99)]);
  }, []);

  // Check WebGPU support
  const checkWebGPU = async () => {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU not available. Use Chrome 113+ or Edge 113+' };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { supported: false, reason: 'No GPU adapter found' };
      
      // Get GPU info - handle different browser implementations
      let gpuName = 'WebGPU Compatible GPU';
      try {
        if (adapter.requestAdapterInfo) {
          const info = await adapter.requestAdapterInfo();
          gpuName = info.description || info.device || info.vendor || gpuName;
        } else if (adapter.info) {
          gpuName = adapter.info.description || adapter.info.device || adapter.info.vendor || gpuName;
        }
      } catch (e) {
        // Info not available, use default
      }
      
      return { supported: true, gpu: gpuName };
    } catch (e) {
      return { supported: false, reason: e.message };
    }
  };

  // Load AI model
  const loadModel = async () => {
    setModelStatus({ loading: true, ready: false, progress: 0, error: null });
    addLog('info', 'Checking WebGPU support...');

    const gpuCheck = await checkWebGPU();
    if (!gpuCheck.supported) {
      setModelStatus({ loading: false, ready: false, progress: 0, error: gpuCheck.reason });
      addLog('error', gpuCheck.reason);
      return false;
    }

    addLog('success', `GPU detected: ${gpuCheck.gpu}`);
    addLog('info', 'Loading AI model (Llama 3.2 1B)... This may take a few minutes on first load.');

    try {
      // Dynamic import WebLLM
      if (!webllm) {
        webllm = await import('https://esm.run/@anthropic-ai/webllm');
      }

      engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (progress) => {
          const pct = Math.round(progress.progress * 100);
          setModelStatus(prev => ({ ...prev, progress: pct }));
          if (pct % 20 === 0) {
            addLog('info', `Model loading: ${pct}% - ${progress.text}`);
          }
        }
      });

      engineRef.current = engine;
      setModelStatus({ loading: false, ready: true, progress: 100, error: null });
      addLog('success', 'AI Model loaded! Ready to mine.');
      return true;
    } catch (error) {
      setModelStatus({ loading: false, ready: false, progress: 0, error: error.message });
      addLog('error', `Failed to load model: ${error.message}`);
      return false;
    }
  };

  // Run real AI inference
  const runInference = async (prompt) => {
    if (!engineRef.current) {
      throw new Error('Model not loaded');
    }

    const startTime = performance.now();
    
    const response = await engineRef.current.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Be concise and accurate.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 256,
      temperature: 0.7
    });

    const endTime = performance.now();
    
    return {
      response: response.choices[0].message.content,
      processingTime: endTime - startTime,
      tokensGenerated: response.usage?.completion_tokens || 0
    };
  };

  const handleConnect = async () => {
    try {
      await connect();
      addLog('success', 'Wallet connected');
    } catch (err) {
      addLog('error', err.message);
    }
  };

  const handleRegister = async () => {
    if (!minerName.trim()) {
      addLog('error', 'Please enter a miner name');
      return;
    }
    
    try {
      const result = await registerMiner(minerName.trim());
      if (result?.success) {
        addLog('success', `Miner "${minerName}" registered`);
      } else {
        addLog('error', result?.error || 'Registration failed');
      }
    } catch (err) {
      addLog('error', err.message);
    }
  };

  const startMining = async () => {
    if (!miner) {
      addLog('error', 'Please register first');
      return;
    }

    // Load model if not ready
    if (!modelStatus.ready) {
      const loaded = await loadModel();
      if (!loaded) return;
    }

    addLog('info', 'Connecting to mining server...');
    
    const ws = new WebSocket('wss://api.taonet.fun/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('success', 'Connected to server');
      ws.send(JSON.stringify({ type: 'auth', address: wallet }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'auth_success') {
          addLog('success', 'Authenticated - Mining with real AI inference');
          setMining(true);
          
          const startTime = Date.now();
          timerRef.current = setInterval(() => {
            setStats(s => ({ ...s, time: Math.floor((Date.now() - startTime) / 1000) }));
          }, 1000);
        } 
        else if (msg.type === 'task') {
          const taskId = msg.task?.id || msg.taskId;
          const prompt = msg.task?.prompt || msg.prompt || 'Hello';
          
          addLog('task', `Task received: ${prompt.substring(0, 50)}...`);
          addLog('info', 'Running AI inference on your GPU...');
          
          try {
            // REAL AI INFERENCE
            const result = await runInference(prompt);
            
            addLog('success', `Generated ${result.tokensGenerated} tokens in ${(result.processingTime/1000).toFixed(1)}s`);
            
            // Send result back
            ws.send(JSON.stringify({
              type: 'task_response',
              taskId: taskId,
              response: result.response,
              processingTime: result.processingTime,
              tokensGenerated: result.tokensGenerated
            }));
            
            const earned = 10 + Math.floor(result.tokensGenerated / 10);
            setStats(s => ({ 
              ...s, 
              tasks: s.tasks + 1,
              tokens: s.tokens + earned,
              tokensGenerated: s.tokensGenerated + result.tokensGenerated
            }));
            addLog('success', `Task completed +${earned} TAO`);
            
          } catch (inferenceError) {
            addLog('error', `Inference failed: ${inferenceError.message}`);
            ws.send(JSON.stringify({
              type: 'task_response',
              taskId: taskId,
              error: inferenceError.message
            }));
          }
        }
        else if (msg.type === 'jackpot') {
          addLog('jackpot', `JACKPOT! ${msg.jackpotType} - ${msg.multiplier}x!`);
          setStats(s => ({ ...s, tokens: s.tokens + (msg.bonus || 0) }));
        }
      } catch (e) {
        console.error('Message error:', e);
      }
    };

    ws.onclose = () => {
      addLog('info', 'Disconnected from server');
      setMining(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    ws.onerror = () => addLog('error', 'Connection error');
  };

  const stopMining = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setMining(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    addLog('info', 'Mining stopped');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <main className="mine-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Start Mining</h1>
          <p className="page-subtitle">Run real AI inference on your GPU and earn tokens</p>
        </div>

        {/* GPU/Model Status Banner */}
        {modelStatus.loading && (
          <div className="model-banner loading">
            <div className="model-info">
              <span className="model-icon">&#9881;</span>
              <div>
                <strong>Loading AI Model...</strong>
                <p>Downloading Llama 3.2 1B to your browser ({modelStatus.progress}%)</p>
              </div>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${modelStatus.progress}%` }} />
            </div>
          </div>
        )}
        
        {modelStatus.ready && (
          <div className="model-banner ready">
            <span className="model-icon">&#10003;</span>
            <div>
              <strong>AI Model Ready</strong>
              <p>Llama 3.2 1B loaded - Real inference on your GPU</p>
            </div>
          </div>
        )}

        {modelStatus.error && (
          <div className="model-banner error">
            <span className="model-icon">!</span>
            <div>
              <strong>GPU Not Available</strong>
              <p>{modelStatus.error}</p>
            </div>
          </div>
        )}

        <div className="mine-grid">
          {/* Setup Panel */}
          <div className="card setup-panel">
            <h3 className="card-title mb-lg">Setup</h3>
            
            {/* Step 1: Connect */}
            <div className={`setup-step ${isConnected ? 'completed' : ''}`}>
              <div className="step-header">
                <span className="step-num">{isConnected ? '>' : '1'}</span>
                <span className="step-title">Connect Wallet</span>
              </div>
              {!isConnected ? (
                <button className="btn btn-primary w-full mt-md" onClick={handleConnect}>
                  Connect Phantom
                </button>
              ) : (
                <p className="step-status">Connected: {api.shortAddress(wallet)}</p>
              )}
            </div>

            {/* Step 2: Register */}
            <div className={`setup-step ${miner ? 'completed' : ''} ${!isConnected ? 'disabled' : ''}`}>
              <div className="step-header">
                <span className="step-num">{miner ? '>' : '2'}</span>
                <span className="step-title">Register Miner</span>
              </div>
              {isConnected && !miner ? (
                <div className="mt-md">
                  <input
                    type="text"
                    className="input mb-sm"
                    placeholder="Enter miner name"
                    value={minerName}
                    onChange={(e) => setMinerName(e.target.value)}
                  />
                  <button className="btn btn-primary w-full" onClick={handleRegister}>
                    Register
                  </button>
                </div>
              ) : miner ? (
                <p className="step-status">Registered as: {miner.name}</p>
              ) : null}
            </div>

            {/* Step 3: Mine */}
            <div className={`setup-step ${!miner ? 'disabled' : ''}`}>
              <div className="step-header">
                <span className="step-num">3</span>
                <span className="step-title">Start Mining</span>
              </div>
              <p className="step-desc">Uses WebGPU to run Llama 3.2 1B locally</p>
              {miner && (
                <button 
                  className={`btn w-full mt-md ${mining ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={mining ? stopMining : startMining}
                  disabled={modelStatus.loading}
                >
                  {modelStatus.loading ? 'Loading Model...' : mining ? 'Stop Mining' : 'Start Mining'}
                </button>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="card stats-panel">
            <h3 className="card-title mb-lg">Mining Stats</h3>
            
            <div className="mining-stats">
              <div className="mining-stat">
                <span className="mining-stat-label">Status</span>
                <span className={`mining-stat-value ${mining ? 'active' : ''}`}>
                  {mining ? 'MINING' : modelStatus.loading ? 'LOADING' : 'IDLE'}
                </span>
              </div>
              <div className="mining-stat">
                <span className="mining-stat-label">Time</span>
                <span className="mining-stat-value">{formatTime(stats.time)}</span>
              </div>
              <div className="mining-stat">
                <span className="mining-stat-label">Tasks</span>
                <span className="mining-stat-value">{stats.tasks}</span>
              </div>
              <div className="mining-stat">
                <span className="mining-stat-label">Earned</span>
                <span className="mining-stat-value accent">{stats.tokens}</span>
              </div>
              <div className="mining-stat span-2">
                <span className="mining-stat-label">AI Tokens Generated</span>
                <span className="mining-stat-value">{stats.tokensGenerated.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="card mt-lg">
          <h3 className="card-title mb-md">Activity Log</h3>
          <div className="logs-container">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} className={`log-item log-${log.type}`}>
                <span className="log-time">{log.time}</span>
                <span className="log-message">{log.message}</span>
              </div>
            )) : (
              <p className="text-tertiary">No activity yet. Start mining to see logs.</p>
            )}
          </div>
        </div>

        {/* How it Works */}
        <div className="card mt-lg">
          <h3 className="card-title mb-md">How Real Mining Works</h3>
          <div className="how-it-works">
            <div className="how-step">
              <span className="how-num">1</span>
              <div>
                <h4>Model Loading</h4>
                <p>Llama 3.2 1B is downloaded to your browser (cached after first load)</p>
              </div>
            </div>
            <div className="how-step">
              <span className="how-num">2</span>
              <div>
                <h4>GPU Inference</h4>
                <p>Your GPU runs real AI inference via WebGPU - no server involved</p>
              </div>
            </div>
            <div className="how-step">
              <span className="how-num">3</span>
              <div>
                <h4>Earn Rewards</h4>
                <p>Completed tasks are verified and you earn TAO tokens</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
