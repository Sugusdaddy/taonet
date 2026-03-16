import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Playground.css';

const SOLANA_SYSTEM_PROMPT = `You are SolanaGPT, an expert AI assistant specialized in Solana blockchain development. You have deep knowledge of:

- Solana architecture (accounts, programs, transactions, PDAs)
- Anchor framework for smart contract development
- Rust programming for Solana programs
- SPL tokens and token programs
- Metaplex for NFTs
- Solana Web3.js and wallet adapters
- DeFi protocols on Solana (Jupiter, Raydium, Orca, Marinade)
- Best practices for security and optimization
- Common vulnerabilities and how to avoid them
- Transaction optimization and compute units
- Cross-program invocations (CPI)

Always provide practical, working code examples when relevant. Be concise but thorough.`;

export default function Playground() {
  const { isConnected, address } = useWallet();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm SolanaGPT, your AI assistant specialized in Solana development. I can help you with smart contracts, Anchor, tokens, NFTs, DeFi, and anything Solana-related. What would you like to build?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ queries: 0, avgTime: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const data = await api.get('/api/playground/stats');
    if (data) setStats(data);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/api/playground/query', {
        prompt: userMessage,
        systemPrompt: SOLANA_SYSTEM_PROMPT,
        address: address || 'anonymous',
        context: messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
      });

      if (response?.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.response,
          meta: {
            miner: response.miner,
            time: response.processingTime,
            proofId: response.proofId
          }
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, no miners are available right now. Please try again in a moment.',
          error: true
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'An error occurred. Please try again.',
        error: true
      }]);
    }

    setLoading(false);
    loadStats();
  }

  const exampleQueries = [
    "How do I create a SPL token?",
    "Write an Anchor program for a counter",
    "Explain PDAs in Solana",
    "How to optimize transaction fees?",
    "Create a token transfer instruction"
  ];

  return (
    <main className="playground-page">
      <div className="playground-container">
        {/* Sidebar */}
        <aside className="playground-sidebar">
          <div className="sidebar-header">
            <div className="model-badge">
              <span className="model-icon">S</span>
              <div>
                <span className="model-name">SolanaGPT</span>
                <span className="model-version">Powered by TaoNet</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Specializations</h4>
            <div className="tags">
              <span className="tag">Anchor</span>
              <span className="tag">Rust</span>
              <span className="tag">SPL Tokens</span>
              <span className="tag">NFTs</span>
              <span className="tag">DeFi</span>
              <span className="tag">Web3.js</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Try asking</h4>
            <div className="examples">
              {exampleQueries.map((q, i) => (
                <button 
                  key={i} 
                  className="example-btn"
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>Network Stats</h4>
            <div className="sidebar-stats">
              <div className="sidebar-stat">
                <span className="stat-value">{stats.queries || 0}</span>
                <span className="stat-label">Queries Today</span>
              </div>
              <div className="sidebar-stat">
                <span className="stat-value">{stats.avgTime || 0}ms</span>
                <span className="stat-label">Avg Response</span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            <p>Responses are generated by decentralized miners running AI inference. Each query creates a verifiable proof.</p>
          </div>
        </aside>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role} ${msg.error ? 'error' : ''}`}>
                <div className="message-avatar">
                  {msg.role === 'assistant' ? 'S' : (address ? address[0].toUpperCase() : 'U')}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {msg.content.split('```').map((part, idx) => {
                      if (idx % 2 === 1) {
                        // Code block
                        const [lang, ...code] = part.split('\n');
                        return (
                          <pre key={idx} className="code-block">
                            <div className="code-header">{lang || 'code'}</div>
                            <code>{code.join('\n')}</code>
                          </pre>
                        );
                      }
                      return <span key={idx}>{part}</span>;
                    })}
                  </div>
                  {msg.meta && (
                    <div className="message-meta">
                      <span>Miner: {msg.meta.miner?.slice(0, 8)}...</span>
                      <span>{msg.meta.time}ms</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="message assistant loading">
                <div className="message-avatar">S</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-form" onSubmit={sendMessage}>
            <div className="chat-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about Solana development..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
            <p className="input-hint">
              Powered by decentralized AI miners. Responses are verifiable on-chain.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
