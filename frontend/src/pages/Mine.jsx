import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Mine.css';

let webllm = null;
let engine = null;

export default function Mine() {
  const { wallet, miner, connect, registerMiner, isConnected } = useWallet();
  const [minerName, setMinerName] = useState('');
  const [mining, setMining] = useState(false);
  const [stats, setStats] = useState({ tasks: 0, tokens: 0, time: 0, aiTokens: 0 });
  const [logs, setLogs] = useState([]);
  const [modelStatus, setModelStatus] = useState({ loading: false, ready: false, progress: 0, error: null });
  
  // Current task state - shows what AI is doing
  const [currentTask, setCurrentTask] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [taskMetrics, setTaskMetrics] = useState(null);
  
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
    }, ...prev.slice(0, 49)]);
  }, []);

  // Check WebGPU support
  const checkWebGPU = async () => {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU not available. Use Chrome 113+ or Edge 113+' };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { supported: false, reason: 'No GPU adapter found' };
      
      let gpuName = 'WebGPU Compatible GPU';
      try {
        if (adapter.requestAdapterInfo) {
          const info = await adapter.requestAdapterInfo();
          gpuName = info.description || info.device || info.vendor || gpuName;
        } else if (adapter.info) {
          gpuName = adapter.info.description || adapter.info.device || adapter.info.vendor || gpuName;
        }
      } catch (e) {}
      
      return { supported: true, gpu: gpuName };
    } catch (e) {
      return { supported: false, reason: e.message };
    }
  };

  // Load AI model
  const loadModel = async () => {
    setModelStatus({ loading: true, ready: false, progress: 0, error: null });
    addLog('info', 'Checking GPU compatibility...');

    const gpuCheck = await checkWebGPU();
    if (!gpuCheck.supported) {
      setModelStatus({ loading: false, ready: false, progress: 0, error: gpuCheck.reason });
      addLog('error', gpuCheck.reason);
      return false;
    }

    addLog('success', `GPU: ${gpuCheck.gpu}`);
    addLog('info', 'Downloading Llama 3.2 1B model (~500MB)...');

    try {
      if (!webllm) {
        webllm = await import('https://esm.run/@mlc-ai/web-llm');
      }

      engine = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (progress) => {
          const pct = Math.round(progress.progress * 100);
          setModelStatus(prev => ({ ...prev, progress: pct }));
          if (pct % 25 === 0 && pct > 0) {
            addLog('info', `Download: ${pct}%`);
          }
        }
      });

      engineRef.current = engine;
      setModelStatus({ loading: false, ready: true, progress: 100, error: null });
      addLog('success', 'Model loaded! Your GPU is ready to run AI inference.');
      return true;
    } catch (error) {
      setModelStatus({ loading: false, ready: false, progress: 0, error: error.message });
      addLog('error', `Failed: ${error.message}`);
      return false;
    }
  };

  // Run real AI inference with streaming
  const runInference = async (prompt) => {
    if (!engineRef.current) throw new Error('Model not loaded');

    const startTime = performance.now();
    let fullResponse = '';
    let tokenCount = 0;
    
    setStreamingResponse('');
    setTaskMetrics({ startTime, tokens: 0, tps: 0 });

    // Use streaming to show response in real-time
    const chunks = await engineRef.current.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Give clear, concise answers.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 256,
      temperature: 0.7,
      stream: true
    });

    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        tokenCount++;
        setStreamingResponse(fullResponse);
        
        const elapsed = (performance.now() - startTime) / 1000;
        setTaskMetrics({
          startTime,
          tokens: tokenCount,
          tps: elapsed > 0 ? (tokenCount / elapsed).toFixed(1) : 0
        });
      }
    }

    const endTime = performance.now();
    
    return {
      response: fullResponse,
      processingTime: endTime - startTime,
      tokensGenerated: tokenCount
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
      addLog('error', 'Enter a miner name');
      return;
    }
    try {
      const result = await registerMiner(minerName.trim());
      if (result?.success) addLog('success', `Registered as "${minerName}"`);
      else addLog('error', result?.error || 'Registration failed');
    } catch (err) {
      addLog('error', err.message);
    }
  };

  const startMining = async () => {
    if (!miner) {
      addLog('error', 'Register first');
      return;
    }

    if (!modelStatus.ready) {
      const loaded = await loadModel();
      if (!loaded) return;
    }

    addLog('info', 'Connecting to TaoNet...');
    
    const ws = new WebSocket('wss://api.taonet.fun/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('success', 'Connected');
      ws.send(JSON.stringify({ type: 'auth', address: wallet }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'auth_success') {
          addLog('success', 'Mining started - waiting for tasks...');
          setMining(true);
          
          const startTime = Date.now();
          timerRef.current = setInterval(() => {
            setStats(s => ({ ...s, time: Math.floor((Date.now() - startTime) / 1000) }));
          }, 1000);
        } 
        else if (msg.type === 'task') {
          const taskId = msg.task?.id || msg.taskId;
          const prompt = msg.task?.prompt || msg.prompt || 'Hello';
          
          // Show current task
          setCurrentTask({
            id: taskId,
            prompt: prompt,
            status: 'processing',
            startTime: Date.now()
          });
          
          addLog('task', `New task: "${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}"`);
          
          try {
            // Run REAL AI inference
            const result = await runInference(prompt);
            
            // Update task status
            setCurrentTask(prev => ({
              ...prev,
              status: 'completed',
              response: result.response,
              time: result.processingTime,
              tokens: result.tokensGenerated
            }));
            
            // Send result to network
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
              aiTokens: s.aiTokens + result.tokensGenerated
            }));
            
            addLog('success', `Completed! Generated ${result.tokensGenerated} tokens in ${(result.processingTime/1000).toFixed(1)}s (+${earned} TAO)`);
            addLog('proof', `Proof submitted to chain - view in Explorer`);
            
            // Clear current task after a moment
            setTimeout(() => {
              setCurrentTask(null);
              setStreamingResponse('');
              setTaskMetrics(null);
            }, 3000);
            
          } catch (err) {
            setCurrentTask(prev => ({ ...prev, status: 'error', error: err.message }));
            addLog('error', `Inference failed: ${err.message}`);
          }
        }
        else if (msg.type === 'jackpot') {
          addLog('jackpot', `JACKPOT! ${msg.multiplier}x bonus!`);
          setStats(s => ({ ...s, tokens: s.tokens + (msg.bonus || 0) }));
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      addLog('info', 'Disconnected');
      setMining(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    ws.onerror = () => addLog('error', 'Connection error');
  };

  const stopMining = () => {
    if (wsRef.current) wsRef.current.close();
    setMining(false);
    setCurrentTask(null);
    if (timerRef.current) clearInterval(timerRef.current);
    addLog('info', 'Mining stopped');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <main className="mine-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">AI Mining</h1>
          <p className="page-subtitle">Your GPU runs real AI inference - earn tokens for completed tasks</p>
        </div>

        {/* Model Loading Banner */}
        {modelStatus.loading && (
          <div className="model-banner loading">
            <div className="banner-content">
              <div className="spinner"></div>
              <div>
                <strong>Downloading AI Model...</strong>
                <p>Llama 3.2 1B ({modelStatus.progress}%) - cached after first download</p>
              </div>
            </div>
            <div className="progress"><div className="progress-bar" style={{ width: `${modelStatus.progress}%` }} /></div>
          </div>
        )}

        {modelStatus.error && (
          <div className="model-banner error">
            <strong>GPU Error:</strong> {modelStatus.error}
          </div>
        )}

        <div className="mine-layout">
          {/* Left: Setup + Stats */}
          <div className="mine-sidebar">
            {/* Setup */}
            <div className="card">
              <h3 className="card-title">Setup</h3>
              
              <div className={`setup-step ${isConnected ? 'done' : ''}`}>
                <span className="step-badge">{isConnected ? '>' : '1'}</span>
                <div className="step-content">
                  <strong>Connect Wallet</strong>
                  {!isConnected ? (
                    <button className="btn btn-primary btn-sm mt-sm" onClick={handleConnect}>Connect Phantom</button>
                  ) : (
                    <p className="step-info">{api.shortAddress(wallet)}</p>
                  )}
                </div>
              </div>

              <div className={`setup-step ${miner ? 'done' : ''} ${!isConnected ? 'disabled' : ''}`}>
                <span className="step-badge">{miner ? '>' : '2'}</span>
                <div className="step-content">
                  <strong>Register Miner</strong>
                  {isConnected && !miner ? (
                    <div className="mt-sm">
                      <input className="input input-sm" placeholder="Miner name" value={minerName} onChange={e => setMinerName(e.target.value)} />
                      <button className="btn btn-primary btn-sm mt-sm" onClick={handleRegister}>Register</button>
                    </div>
                  ) : miner ? (
                    <p className="step-info">{miner.name}</p>
                  ) : null}
                </div>
              </div>

              <div className={`setup-step ${!miner ? 'disabled' : ''}`}>
                <span className="step-badge">3</span>
                <div className="step-content">
                  <strong>Start Mining</strong>
                  {miner && (
                    <button 
                      className={`btn btn-sm mt-sm ${mining ? 'btn-danger' : 'btn-primary'}`}
                      onClick={mining ? stopMining : startMining}
                      disabled={modelStatus.loading}
                    >
                      {modelStatus.loading ? 'Loading...' : mining ? 'Stop' : 'Start Mining'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="card mt-md">
              <h3 className="card-title">Session Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{formatTime(stats.time)}</span>
                  <span className="stat-label">Time</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.tasks}</span>
                  <span className="stat-label">Tasks</span>
                </div>
                <div className="stat-item highlight">
                  <span className="stat-value">{stats.tokens}</span>
                  <span className="stat-label">TAO Earned</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.aiTokens.toLocaleString()}</span>
                  <span className="stat-label">AI Tokens</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Activity */}
          <div className="mine-main">
            {/* Current Task - Real-time AI Activity */}
            <div className="card ai-activity">
              <div className="ai-header">
                <h3 className="card-title">AI Activity</h3>
                {mining && <span className="status-badge live">LIVE</span>}
                {!mining && modelStatus.ready && <span className="status-badge ready">READY</span>}
                {!mining && !modelStatus.ready && <span className="status-badge idle">IDLE</span>}
              </div>

              {currentTask ? (
                <div className="task-display">
                  {/* Input */}
                  <div className="task-section">
                    <div className="section-label">INPUT PROMPT</div>
                    <div className="task-prompt">{currentTask.prompt}</div>
                  </div>

                  {/* Output - Streaming */}
                  <div className="task-section">
                    <div className="section-label">
                      AI RESPONSE 
                      {taskMetrics && (
                        <span className="metrics-inline">
                          {taskMetrics.tokens} tokens @ {taskMetrics.tps} tok/s
                        </span>
                      )}
                    </div>
                    <div className={`task-response ${currentTask.status === 'processing' ? 'typing' : ''}`}>
                      {streamingResponse || '...'}
                      {currentTask.status === 'processing' && <span className="cursor">|</span>}
                    </div>
                  </div>

                  {/* Status */}
                  {currentTask.status === 'completed' && (
                    <div className="task-complete">
                      Task completed in {(currentTask.time/1000).toFixed(1)}s - {currentTask.tokens} tokens generated
                    </div>
                  )}
                </div>
              ) : mining ? (
                <div className="waiting-tasks">
                  <div className="pulse-dot"></div>
                  <p>Waiting for tasks from the network...</p>
                  <p className="text-sm">Your GPU is ready. Tasks are assigned when clients submit AI requests.</p>
                </div>
              ) : (
                <div className="not-mining">
                  <p><strong>How it works:</strong></p>
                  <ol>
                    <li>Start mining to download the AI model (~500MB, cached)</li>
                    <li>Your GPU connects to the TaoNet network</li>
                    <li>When clients submit prompts, your GPU runs real AI inference</li>
                    <li>You see the prompt and watch the AI generate a response</li>
                    <li>Completed tasks earn you TAO tokens</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="card mt-md">
              <h3 className="card-title">Log</h3>
              <div className="logs-container">
                {logs.map((log, i) => (
                  <div key={i} className={`log-item log-${log.type}`}>
                    <span className="log-time">{log.time}</span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-muted">Start mining to see activity</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
