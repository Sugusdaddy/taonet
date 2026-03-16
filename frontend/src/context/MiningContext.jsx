import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from './WalletContext';

const MiningContext = createContext(null);

export function MiningProvider({ children }) {
  const { wallet, miner, isConnected } = useWallet();
  
  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle'); // idle, loading, ready, error
  const [modelProgress, setModelProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [taskMetrics, setTaskMetrics] = useState({ tokens: 0, tokensPerSec: 0 });
  const [sessionStats, setSessionStats] = useState({
    startTime: null,
    tasksCompleted: 0,
    tokensGenerated: 0,
    taoEarned: 0
  });
  const [logs, setLogs] = useState([]);
  const [lastProof, setLastProof] = useState(null);
  
  // Refs
  const wsRef = useRef(null);
  const engineRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { 
      time: new Date().toLocaleTimeString(), 
      msg, 
      type 
    }]);
  }, []);

  // Load WebLLM engine
  const loadModel = useCallback(async () => {
    if (engineRef.current || modelStatus === 'loading') return;
    
    setModelStatus('loading');
    setModelProgress(0);
    addLog('Loading AI model (Llama 3.2 1B)...', 'info');
    
    try {
      const webllm = await import('https://esm.run/@mlc-ai/web-llm');
      
      const engine = await webllm.CreateMLCEngine(
        "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        {
          initProgressCallback: (progress) => {
            const pct = Math.round(progress.progress * 100);
            setModelProgress(pct);
            if (progress.text) {
              addLog(progress.text, 'info');
            }
          }
        }
      );
      
      engineRef.current = engine;
      setModelStatus('ready');
      addLog('AI model loaded successfully!', 'success');
      return true;
    } catch (err) {
      console.error('Model load error:', err);
      setModelStatus('error');
      addLog(`Failed to load model: ${err.message}`, 'error');
      return false;
    }
  }, [modelStatus, addLog]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!wallet || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket('wss://api.taonet.fun/ws');
    wsRef.current = ws;
    
    ws.onopen = () => {
      addLog('Connected to TaoNet', 'success');
      ws.send(JSON.stringify({
        type: 'auth',
        address: wallet
      }));
      // Send ready immediately after auth
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ready' }));
          addLog('Ready for tasks', 'info');
        }
      }, 500);
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'auth_success':
          addLog('Authenticated successfully', 'success');
          ws.send(JSON.stringify({ type: 'ready' }));
          break;
          
        case 'task':
          console.log('[Mining] Task received:', data.task);
          addLog(`Task received: ${data.task?.prompt?.slice(0, 40)}...`, 'task');
          if (engineRef.current) {
            await processTask(data.task);
          } else {
            addLog('Engine not ready, skipping task', 'error');
          }
          break;
          
        case 'task_received':
          addLog(`Task ${data.taskId.slice(0, 8)} accepted`, 'success');
          break;
          
        case 'proof_created':
          setLastProof(data.proof);
          addLog(`Proof #${data.proof.blockNumber} created!`, 'proof');
          break;
          
        case 'task_error':
          addLog(`Task error: ${data.error}`, 'error');
          break;
      }
    };
    
    ws.onclose = () => {
      addLog('Disconnected from TaoNet', 'error');
      wsRef.current = null;
      
      // Auto-reconnect if still mining
      if (isMining) {
        reconnectTimeoutRef.current = setTimeout(() => {
          addLog('Reconnecting...', 'info');
          connectWebSocket();
        }, 3000);
      }
    };
    
    ws.onerror = () => {
      addLog('Connection error', 'error');
    };
  }, [wallet, isMining, addLog]);

  // Process task with AI
  const processTask = useCallback(async (task) => {
    if (!engineRef.current) return;
    
    setCurrentTask(task);
    setStreamingResponse('');
    setTaskMetrics({ tokens: 0, tokensPerSec: 0 });
    addLog(`Processing: "${task.prompt.slice(0, 50)}..."`, 'task');
    
    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;
    
    try {
      const chunks = await engineRef.current.chat.completions.create({
        messages: [{ role: 'user', content: task.prompt }],
        stream: true,
        max_tokens: 512
      });
      
      for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        tokenCount++;
        
        setStreamingResponse(fullResponse);
        setTaskMetrics({
          tokens: tokenCount,
          tokensPerSec: (tokenCount / ((Date.now() - startTime) / 1000)).toFixed(1)
        });
      }
      
      const processingTime = Date.now() - startTime;
      
      // Send response
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'task_response',
          taskId: task.id || task._id,
          response: {
            response: fullResponse,
            tokensGenerated: tokenCount,
            processingTimeMs: processingTime
          },
          processingTime
        }));
        
        setSessionStats(prev => ({
          ...prev,
          tasksCompleted: prev.tasksCompleted + 1,
          tokensGenerated: prev.tokensGenerated + tokenCount,
          taoEarned: prev.taoEarned + 1
        }));
        
        addLog(`Completed in ${(processingTime/1000).toFixed(1)}s (${tokenCount} tokens)`, 'success');
      }
      
      // Clear current task after delay
      setTimeout(() => {
        setCurrentTask(null);
        setStreamingResponse('');
      }, 2000);
      
    } catch (err) {
      addLog(`Inference error: ${err.message}`, 'error');
      setCurrentTask(null);
    }
  }, [addLog]);

  // Start mining
  const startMining = useCallback(async () => {
    if (!isConnected || !miner) {
      addLog('Please connect wallet and register first', 'error');
      return false;
    }
    
    // Load model if needed
    if (!engineRef.current) {
      const loaded = await loadModel();
      if (!loaded) return false;
    }
    
    setIsMining(true);
    setSessionStats(prev => ({
      ...prev,
      startTime: prev.startTime || Date.now()
    }));
    
    connectWebSocket();
    addLog('Mining started!', 'success');
    return true;
  }, [isConnected, miner, loadModel, connectWebSocket, addLog]);

  // Stop mining
  const stopMining = useCallback(() => {
    setIsMining(false);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    addLog('Mining stopped', 'info');
  }, [addLog]);

  // Reconnect when wallet changes while mining
  useEffect(() => {
    if (isMining && wallet && !wsRef.current) {
      connectWebSocket();
    }
  }, [isMining, wallet, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Heartbeat
  useEffect(() => {
    if (!isMining) return;
    
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 20000);
    
    return () => clearInterval(interval);
  }, [isMining]);

  const value = {
    // State
    isMining,
    modelStatus,
    modelProgress,
    currentTask,
    streamingResponse,
    taskMetrics,
    sessionStats,
    logs,
    lastProof,
    
    // Actions
    startMining,
    stopMining,
    loadModel
  };

  return (
    <MiningContext.Provider value={value}>
      {children}
    </MiningContext.Provider>
  );
}

export function useMining() {
  const context = useContext(MiningContext);
  if (!context) {
    throw new Error('useMining must be used within MiningProvider');
  }
  return context;
}
