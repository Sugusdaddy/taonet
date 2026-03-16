import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Mine.css';

export default function Mine() {
  const { wallet, miner, connect, registerMiner, isConnected } = useWallet();
  const [minerName, setMinerName] = useState('');
  const [mining, setMining] = useState(false);
  const [stats, setStats] = useState({ tasks: 0, tokens: 0, time: 0 });
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const addLog = (type, message) => {
    setLogs(prev => [{
      type,
      message,
      time: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 49)]);
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
        addLog('success', `Miner "${minerName}" registered successfully`);
      } else {
        addLog('error', result?.error || 'Registration failed');
      }
    } catch (err) {
      addLog('error', err.message);
    }
  };

  const startMining = () => {
    if (!miner) {
      addLog('error', 'Please register first');
      return;
    }

    addLog('info', 'Connecting to mining server...');
    
    const ws = new WebSocket('wss://api.taonet.fun/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('success', 'Connected to server');
      ws.send(JSON.stringify({ type: 'auth', address: wallet }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'auth_success') {
          addLog('success', 'Authentication successful - Mining started');
          setMining(true);
          
          // Start timer
          const startTime = Date.now();
          timerRef.current = setInterval(() => {
            setStats(s => ({ ...s, time: Math.floor((Date.now() - startTime) / 1000) }));
          }, 1000);
        } 
        else if (msg.type === 'task') {
          const taskId = msg.task?.id || msg.taskId;
          const taskPrompt = msg.task?.prompt || msg.prompt || 'Processing...';
          addLog('task', `Task received: ${taskId?.substring(0, 8)}... - ${taskPrompt.substring(0, 30)}`);
          
          // Process task (simulate AI inference)
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'task_response',
              taskId: taskId,
              response: `Completed by ${miner.name}: Result for "${taskPrompt.substring(0, 20)}..."`,
              processingTime: 800 + Math.random() * 500
            }));
            
            const earned = 10 + Math.floor(Math.random() * 5);
            setStats(s => ({ 
              ...s, 
              tasks: s.tasks + 1,
              tokens: s.tokens + earned
            }));
            addLog('success', `Task completed +${earned} tokens`);
          }, 800 + Math.random() * 500);
        }
        else if (msg.type === 'jackpot') {
          addLog('jackpot', `JACKPOT! ${msg.jackpotType} - ${msg.multiplier}x multiplier!`);
          setStats(s => ({ ...s, tokens: s.tokens + msg.bonus }));
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      addLog('info', 'Disconnected from server');
      setMining(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    ws.onerror = () => {
      addLog('error', 'Connection error');
    };
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
          <p className="page-subtitle">Process AI tasks and earn tokens</p>
        </div>

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
              {miner && (
                <button 
                  className={`btn w-full mt-md ${mining ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={mining ? stopMining : startMining}
                >
                  {mining ? 'Stop Mining' : 'Start Mining'}
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
                  {mining ? 'MINING' : 'IDLE'}
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
            </div>
          </div>
        </div>

        {/* Logs */}
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
      </div>
    </main>
  );
}
