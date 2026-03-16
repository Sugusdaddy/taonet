import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { api } from '../services/api';
import './TaoNetChat.css';

export default function TaoNetChat() {
  const { wallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Welcome to TaoNet AI! Ask me anything and miners will process your request.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Submit as a task to the network
      const response = await api.post('/api/chat', {
        message: userMsg,
        wallet: wallet?.publicKey || 'anonymous'
      });

      setMessages(prev => [...prev, { 
        from: 'bot', 
        text: response.data.response || response.data.message || 'Task submitted to the network.',
        taskId: response.data.taskId,
        miner: response.data.miner
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        from: 'bot', 
        text: 'Network busy. Please try again.',
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className={`taonet-chat-btn ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="TaoNet AI Chat"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="taonet-chat">
          <div className="chat-header">
            <div className="header-info">
              <div className="ai-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <div>
                <span className="title">TaoNet AI</span>
                <span className="subtitle">Powered by miners</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.from} ${msg.error ? 'error' : ''}`}>
                <div className="message-content">
                  {msg.text}
                  {msg.miner && (
                    <div className="message-meta">
                      Processed by: {msg.miner.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TaoNet AI anything..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}