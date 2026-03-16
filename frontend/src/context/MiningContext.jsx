import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from './WalletContext';

const MiningContext = createContext(null);

export function MiningProvider({ children }) {
  const { wallet, miner, isConnected } = useWallet();
  
  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle'); // idle, checking, loading, ready, error, no-gpu
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
  const [gpuInfo, setGpuInfo] = useState(null);
  
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

  // Check WebGPU support
  const checkGPUSupport = useCallback(async () => {
    setModelStatus('checking');
    addLog('Checking GPU compatibility...', 'info');
    
    // Check if WebGPU is available
    if (!navigator.gpu) {
      setModelStatus('no-gpu');
      setGpuInfo({ supported: false, reason: 'WebGPU not available in this browser' });
      addLog('WebGPU not supported. Try Chrome 113+, Edge 113+, or Firefox Nightly.', 'error');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        setModelStatus('no-gpu');
        setGpuInfo({ supported: false, reason: 'No GPU adapter found' });
        addLog('No compatible GPU found. Check your graphics drivers.', 'error');
        return false;
      }
      
      const info = await adapter.requestAdapterInfo();
      const device = await adapter.requestDevice();
      
      const gpuDetails = {
        supported: true,
        vendor: info.vendor || 'Unknown',
        architecture: info.architecture || 'Unknown',
        device: info.device || 'Unknown',
        description: info.description || 'WebGPU Ready'
      };
      
      setGpuInfo(gpuDetails);
      addLog(`GPU detected: ${gpuDetails.vendor} ${gpuDetails.device || gpuDetails.architecture}`, 'success');
      setModelStatus('idle');
      return true;
    } catch (err) {
      setModelStatus('no-gpu');
      setGpuInfo({ supported: false, reason: err.message });
      addLog(`GPU check failed: ${err.message}`, 'error');
      return false;
    }
  }, [addLog]);

  // Check GPU on mount
  useEffect(() => {
    checkGPUSupport();
  }, []);

  // Load WebLLM engine
  const loadModel = useCallback(async () => {
    if (engineRef.current || modelStatus === 'loading') return;
    
    // Re-check GPU if needed
    if (modelStatus === 'no-gpu' || !gpuInfo?.supported) {
      const hasGPU = await checkGPUSupport();
      if (!hasGPU) return false;
    }
    
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
      
      // Check if it's a GPU error
      if (err.message.includes('GPU') || err.message.includes('WebGPU')) {
        setModelStatus('no-gpu');
        setGpuInfo({ supported: false, reason: err.message });
        addLog('GPU error: ' + err.message, 'error');
      } else {
        setModelStatus('error');
        addLog(`Failed to load model: ${err.message}`, 'error');
      }
      return false;
    }
  }, [modelStatus, gpuInfo, addLog, checkGPUSupport]);

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
          gpuVendor: gpuInfo?.vendor || 'unknown'
        }
      }));
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'auth_success':
          addLog(`Authenticated (Lv.${data.miner?.level || 1})`, 'success');
          ws.send(JSON.stringify({ type: 'ready' }));
          addLog('Ready for tasks', 'info');
          break;
          
        case 'task':
          console.log('[Mining] Task received:', data.task);
          setCurrentTask(data.task);
          addLog(`Task: ${data.task?.prompt?.slice(0, 50)}...`, 'task');
          if (engineRef.current) {
            await processTask(data.task);
          } else {
            addLog('Engine not ready, skipping task', 'error');
            ws.send(JSON.stringify({ type: 'ready' }));
          }
          break;
          
        case 'task_accepted':
          const reward = parseFloat(data.reward) / 1e18;
          setSessionStats(prev => ({
            ...prev,
            tasksCompleted: prev.tasksCompleted + 1,
            taoEarned: prev.taoEarned + reward
          }));
          addLog(`+${data.xp} XP, +${reward.toFixed(4)} TAO`, 'success');
          if (data.leveledUp) {
            addLog(`LEVEL UP! Now Lv.${data.level}`, 'success');
          }
          setLastProof({ id: data.proofId, taskId: data.taskId });
          break;
          
        case 'heartbeat_ack':
          // Silent
          break;
          
        case 'error':
          addLog(`Error: ${data.message}`, 'error');
          break;
          
        default:
          console.log('[WS] Unknown message:', data.type);
      }
    };
    
    ws.onclose = () => {
      addLog('Disconnected', 'error');
      wsRef.current = null;
      
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
  }, [wallet, isMining, gpuInfo, addLog]);

  // Process task with AI
  const processTask = useCallback(async (task) => {
    if (!engineRef.current) return;
    
    const startTime = Date.now();
    setStreamingResponse('');
    setTaskMetrics({ tokens: 0, tokensPerSec: 0 });
    
    try {
      const messages = [
        { 
          role: "system", 
          content: "You are SolanaGPT, a helpful AI assistant specialized in Solana blockchain development. Provide accurate, concise answers about Solana, Anchor, Rust, SPL tokens, NFTs, and DeFi. Include code examples when relevant."
        },
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
        
        setStreamingResponse(fullResponse);
        setTaskMetrics({
          tokens: tokenCount,
          tokensPerSec: tokenCount / ((Date.now() - startTime) / 1000)
        });
      }
      
      const processingTime = Date.now() - startTime;
      
      setSessionStats(prev => ({
        ...prev,
        tokensGenerated: prev.tokensGenerated + tokenCount
      }));
      
      // Send response
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'task_response',
          taskId: task._id || task.id,
          response: fullResponse,
          processingTime,
          modelInfo: {
            name: 'Llama-3.2-1B-Instruct',
            parameters: '1B',
            quantization: 'q4f16'
          }
        }));
        
        addLog(`Response sent (${tokenCount} tokens, ${(processingTime/1000).toFixed(1)}s)`, 'success');
      }
      
      setCurrentTask(null);
      
      // Ready for next task
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ready' }));
        }
      }, 500);
      
    } catch (err) {
      addLog(`Task failed: ${err.message}`, 'error');
      setCurrentTask(null);
      
      // Still send ready
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ready' }));
      }
    }
  }, [addLog]);

  // Heartbeat
  useEffect(() => {
    if (!isMining || !wsRef.current) return;
    
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
    
    // Load model if needed
    if (!engineRef.current) {
      const loaded = await loadModel();
      if (!loaded) return;
    }
    
    setIsMining(true);
    setSessionStats({
      startTime: Date.now(),
      tasksCompleted: 0,
      tokensGenerated: 0,
      taoEarned: 0
    });
    
    addLog('Mining started!', 'success');
    connectWebSocket();
  }, [wallet, miner, loadModel, connectWebSocket, addLog]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  return (
    <MiningContext.Provider value={{
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
