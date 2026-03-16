import { useState } from 'react';
import './SupportChat.css';

const FAQ = [
  { q: 'How do I start mining?', a: 'Connect your Phantom wallet, register a miner name, then click Start Mining. Your browser will download a small AI model and begin processing tasks.' },
  { q: 'What are the requirements?', a: 'Chrome 113+ or Edge 113+ with WebGPU support, a GPU, and a Phantom wallet. The AI model is about 500MB and gets cached after first download.' },
  { q: 'How much can I earn?', a: 'Earnings depend on task completion, speed, and your tier. Higher tiers get multiplier bonuses. Active miners with good hardware can earn more.' },
  { q: 'What is Proof of Inference?', a: 'Every AI computation you perform is cryptographically hashed and verified. These proofs are anchored to Solana blockchain for transparency.' },
  { q: 'Is my data safe?', a: 'All processing happens locally in your browser. Your prompts and responses are hashed but the content stays on your machine.' },
];

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! How can I help you with TaoNet?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setInput('');

    // Simple FAQ matching
    const match = FAQ.find(f => 
      userMsg.toLowerCase().includes(f.q.toLowerCase().split(' ')[2]) ||
      f.q.toLowerCase().includes(userMsg.toLowerCase().split(' ')[0])
    );

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        from: 'bot', 
        text: match?.a || "I'm not sure about that. Try asking about mining, requirements, earnings, or Proof of Inference."
      }]);
    }, 500);
  };

  const quickAsk = (q) => {
    setMessages(prev => [...prev, { from: 'user', text: q }]);
    const faq = FAQ.find(f => f.q === q);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: faq?.a || "Let me look into that." }]);
    }, 500);
  };

  return (
    <>
      <button className={`support-btn ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="support-chat">
          <div className="chat-header">
            <div className="header-info">
              <span className="status-dot online"></span>
              <span>TaoNet Support</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.from}`}>
                <div className="message-content">{msg.text}</div>
              </div>
            ))}
            
            {messages.length === 1 && (
              <div className="faq-suggestions">
                <span className="faq-title">Common questions:</span>
                {FAQ.slice(0, 3).map((f, i) => (
                  <button key={i} onClick={() => quickAsk(f.q)}>{f.q}</button>
                ))}
              </div>
            )}
          </div>

          <form className="chat-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
            />
            <button type="submit">
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
