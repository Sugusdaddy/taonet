import { useState, useRef, useEffect } from 'react';
import './SupportChat.css';

const FAQ = [
  {
    q: "How do I start mining?",
    a: "Go to the Mine page, connect your wallet, register a miner name, then click Start Mining. You need a WebGPU-compatible browser (Chrome 113+) and a dedicated GPU."
  },
  {
    q: "What GPU do I need?",
    a: "Any modern GPU with WebGPU support: NVIDIA GTX 1060+, AMD RX 580+, or Intel Arc. Make sure your drivers are updated and you're using Chrome 113+ or Edge 113+."
  },
  {
    q: "How are rewards calculated?",
    a: "Base reward + Speed Bonus (up to +50%) + Quality Bonus (up to +40%) + Streak Bonus (up to +75%) + Level Multiplier (+5% per level) + Staking Tier Multiplier."
  },
  {
    q: "What is Proof of Inference?",
    a: "Unlike Bitcoin's useless hash puzzles, TaoNet miners do real AI work. Each response generates a cryptographic proof that's anchored to Solana blockchain for verification."
  },
  {
    q: "How do I level up?",
    a: "Complete tasks to earn XP. Higher levels unlock harder tasks with bigger rewards. Level requirements follow exponential curve: 100 * 1.5^level XP needed."
  },
  {
    q: "What are staking tiers?",
    a: "Stake TAO tokens for reward multipliers: Bronze (0) = 1x, Silver (10K) = 1.25x, Gold (100K) = 1.5x, Platinum (1M) = 2x, Diamond (10M) = 3x."
  },
  {
    q: "Is SolanaGPT free?",
    a: "Yes! SolanaGPT uses the TaoNet network. Responses come from miners earning rewards, or from our knowledge base of previously-answered questions."
  },
  {
    q: "How do referrals work?",
    a: "Share your referral code. When someone uses it: both get 0.5 TAO + 100 XP welcome bonus. You also earn 10% ongoing commission from their mining rewards."
  }
];

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm TaoNet Support Bot. How can I help you today?", time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [showFaq, setShowFaq] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findAnswer = (question) => {
    const q = question.toLowerCase();
    
    // Check FAQ
    for (const faq of FAQ) {
      const keywords = faq.q.toLowerCase().split(' ').filter(w => w.length > 3);
      const matches = keywords.filter(kw => q.includes(kw));
      if (matches.length >= 2 || q.includes(faq.q.toLowerCase().slice(0, 20))) {
        return faq.a;
      }
    }
    
    // Keyword matching
    if (q.includes('mining') || q.includes('mine') || q.includes('start')) {
      return FAQ[0].a;
    }
    if (q.includes('gpu') || q.includes('webgpu') || q.includes('graphics')) {
      return FAQ[1].a;
    }
    if (q.includes('reward') || q.includes('earn') || q.includes('money')) {
      return FAQ[2].a;
    }
    if (q.includes('proof') || q.includes('inference') || q.includes('verify')) {
      return FAQ[3].a;
    }
    if (q.includes('level') || q.includes('xp') || q.includes('experience')) {
      return FAQ[4].a;
    }
    if (q.includes('stake') || q.includes('staking') || q.includes('tier')) {
      return FAQ[5].a;
    }
    if (q.includes('solanagpt') || q.includes('playground') || q.includes('chat')) {
      return FAQ[6].a;
    }
    if (q.includes('referral') || q.includes('invite') || q.includes('friend')) {
      return FAQ[7].a;
    }
    
    return null;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowFaq(false);
    
    // Find answer
    setTimeout(() => {
      const answer = findAnswer(input);
      const botMsg = {
        role: 'bot',
        text: answer || "I'm not sure about that. Try asking about: mining, rewards, GPU requirements, levels, staking, or referrals. For complex issues, join our Discord!",
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 500);
  };

  const handleFaqClick = (faq) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: faq.q, time: new Date() },
      { role: 'bot', text: faq.a, time: new Date() }
    ]);
    setShowFaq(false);
  };

  return (
    <>
      {/* Chat Button */}
      <button 
        className={`support-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="support-chat">
          <div className="chat-header">
            <div className="header-info">
              <span className="status-dot"></span>
              <span>TaoNet Support</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-content">{msg.text}</div>
                <div className="message-time">
                  {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            
            {showFaq && (
              <div className="faq-suggestions">
                <span className="faq-title">Common Questions:</span>
                {FAQ.slice(0, 4).map((faq, i) => (
                  <button key={i} onClick={() => handleFaqClick(faq)}>
                    {faq.q}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={!input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div className="chat-footer">
            <a href="https://discord.gg/taonet" target="_blank" rel="noopener">
              Join Discord for live support
            </a>
          </div>
        </div>
      )}
    </>
  );
}
