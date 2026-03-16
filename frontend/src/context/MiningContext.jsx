import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from './WalletContext';

const MiningContext = createContext(null);

export function MiningProvider({ children }) {
  const { wallet, miner, isConnected } = useWallet();
  
  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskOutput, setTaskOutput] = useState('');
  const [sessionStats, setSessionStats] = useState({
    tasks: 0,
    earned: 0,
    tokens: 0,
    time: '0:00'
  });
  const [logs, setLogs] = useState([]);
  const [gpuInfo, setGpuInfo] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  
  // Refs
  const wsRef = useRef(null);
  const engineRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const sessionStartRef = useRef(null);
  const timerRef = useRef(null);
  const backendModeRef = useRef(false);
  
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { 
      time: new Date().toLocaleTimeString(), 
      message, 
      type 
    }]);
  }, []);

  // Check GPU support
  const checkGPUSupport = useCallback(async () => {
    if (!navigator.gpu) {
      setGpuInfo({ supported: false, adapter: 'Using CPU fallback' });
      addLog('WebGPU not available - will use server-side processing', 'warning');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        setGpuInfo({ supported: false, adapter: 'No GPU adapter' });
        addLog('No GPU adapter found - will use server-side processing', 'warning');
        return false;
      }
      
      let adapterName = 'WebGPU Ready';
      try {
        const info = await adapter.requestAdapterInfo?.();
        if (info) {
          adapterName = [info.vendor, info.device || info.architecture].filter(Boolean).join(' ') || 'WebGPU Ready';
        }
      } catch {}
      
      setGpuInfo({ supported: true, adapter: adapterName });
      addLog(`GPU detected: ${adapterName}`, 'success');
      return true;
    } catch (err) {
      setGpuInfo({ supported: false, adapter: 'GPU check failed' });
      addLog('GPU check failed - will use server-side processing', 'warning');
      return false;
    }
  }, [addLog]);

  // Load WebLLM (only if GPU available)
  const loadModel = useCallback(async () => {
    if (engineRef.current) return true;
    if (!gpuInfo?.supported) {
      backendModeRef.current = true;
      addLog('Using server-side AI processing', 'info');
      return true;
    }
    
    setModelLoading(true);
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
          }
        }
      );
      
      engineRef.current = engine;
      backendModeRef.current = false;
      setModelLoading(false);
      addLog('AI model ready!', 'success');
      return true;
    } catch (err) {
      console.error('Model load error:', err);
      backendModeRef.current = true;
      setModelLoading(false);
      addLog('Using server-side AI (GPU model failed)', 'warning');
      return true;
    }
  }, [gpuInfo, addLog]);

  // Session timer
  useEffect(() => {
    if (isMining && sessionStartRef.current) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setSessionStats(prev => ({ ...prev, time: `${mins}:${secs.toString().padStart(2, '0')}` }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMining]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!wallet || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://api.taonet.fun/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      addLog('Connected to TaoNet', 'success');
      ws.send(JSON.stringify({
        type: 'auth',
        address: wallet,
        capabilities: {
          gpu: gpuInfo?.supported || false,
          backend: backendModeRef.current
        }
      }));
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'auth_success':
          addLog(`Authenticated as ${data.miner?.name || 'Miner'}`, 'success');
          ws.send(JSON.stringify({ type: 'ready' }));
          addLog('Waiting for tasks...', 'info');
          break;
          
        case 'task':
          setCurrentTask(data.task);
          setTaskOutput('');
          const diffLabel = data.task?.difficultyName ? ` [${data.task.difficultyName}]` : '';
          addLog(`Task received${diffLabel}: ${data.task?.prompt?.slice(0, 50)}...`, 'task');
          await processTask(data.task);
          break;
        
        case 'task_stream':
          // Streaming response from server
          setTaskOutput(prev => prev + data.chunk);
          break;
          
        case 'task_accepted':
          const reward = data.reward ? parseFloat(data.reward) / 1e18 : 0.001;
          const xp = data.xp || 0;
          setSessionStats(prev => ({
            ...prev,
            tasks: prev.tasks + 1,
            earned: prev.earned + reward
          }));
          
          // Show final response if provided
          if (data.response) {
            setTaskOutput(data.response);
          }
          
          let msg = `Task completed! +${reward.toFixed(4)} TAO`;
          if (xp > 0) msg += ` +${xp} XP`;
          if (data.leveledUp) msg += ` LEVEL UP!`;
          addLog(msg, 'success');
          
          // Small delay to let user see the result
          setTimeout(() => {
            setCurrentTask(null);
            setTaskOutput('');
            // Request next task
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ready' }));
            }
          }, 1500);
          break;
          
        case 'heartbeat_ack':
          break;
          
        case 'error':
          addLog(`Error: ${data.message}`, 'error');
          // Request next task after error
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ready' }));
            }
          }, 2000);
          break;
      }
    };
    
    ws.onclose = () => {
      addLog('Disconnected from TaoNet', 'warning');
      wsRef.current = null;
      
      if (isMining) {
        reconnectTimeoutRef.current = setTimeout(() => {
          addLog('Reconnecting...', 'info');
          connectWebSocket();
        }, 3000);
      }
    };
    
    ws.onerror = () => addLog('Connection error', 'error');
  }, [wallet, isMining, gpuInfo, addLog]);

  // Process task
  const processTask = useCallback(async (task) => {
    const startTime = Date.now();
    
    // Backend mode - server processes the task
    if (backendModeRef.current || !engineRef.current) {
      setTaskOutput('Generating response...');
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'task_response',
          taskId: task._id || task.id,
          response: '[SERVER_PROCESS]',
          processingTime: Date.now() - startTime,
          backend: true
        }));
      }
      return;
    }
    
    // GPU mode - local processing
    try {
      const messages = [
        { role: "system", content: "You are SolanaGPT, a helpful AI assistant. Provide accurate, concise answers." },
        { role: "user", content: task.prompt }
      ];
      
      let fullResponse = '';
      let tokenCount = 0;
      
      const stream = await engineRef.current.chat.completions.create({
        messages,
        stream: true,
        max_tokens: task.maxTokens || 200
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        tokenCount++;
        setTaskOutput(fullResponse);
      }
      
      const processingTime = Date.now() - startTime;
      
      setSessionStats(prev => ({
        ...prev,
        tokens: prev.tokens + tokenCount
      }));
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'task_response',
          taskId: task._id || task.id,
          response: fullResponse,
          processingTime,
          tokensGenerated: tokenCount
        }));
        addLog(`Generated ${tokenCount} tokens in ${(processingTime/1000).toFixed(1)}s`, 'info');
      }
      
    } catch (err) {
      addLog(`Processing error: ${err.message}`, 'error');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ready' }));
      }
    }
  }, [addLog]);

  // Heartbeat
  useEffect(() => {
    if (!isMining) return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isMining]);

  // Start mining
  const startMining = useCallback(async () => {
    if (!wallet || !miner) {
      addLog('Connect wallet and register first', 'error');
      return;
    }
    
    const loaded = await loadModel();
    if (!loaded) {
      addLog('Failed to initialize', 'error');
      return;
    }
    
    sessionStartRef.current = Date.now();
    setSessionStats({ tasks: 0, earned: 0, tokens: 0, time: '0:00' });
    setIsMining(true);
    addLog('Mining started!', 'success');
    connectWebSocket();
  }, [wallet, miner, loadModel, connectWebSocket, addLog]);

  // Stop mining
  const stopMining = useCallback(() => {
    setIsMining(false);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    addLog('Mining stopped', 'info');
  }, [addLog]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <MiningContext.Provider value={{
      isMining,
      startMining,
      stopMining,
      currentTask,
      taskOutput,
      sessionStats,
      logs,
      gpuInfo,
      checkGPUSupport,
      modelLoading,
      modelProgress
    }}>
      {children}
    </MiningContext.Provider>
  );
}

export function useMining() {
  const ctx = useContext(MiningContext);
  if (!ctx) throw new Error('useMining must be inside MiningProvider');
  return ctx;
}
