import { useState } from 'react';
import './Docs.css';

export default function Docs() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'mining', label: 'Mining' },
    { id: 'proof-of-inference', label: 'Proof of Inference' },
    { id: 'tiers', label: 'Staking Tiers' },
    { id: 'api', label: 'API Reference' },
  ];

  return (
    <main className="docs-page">
      <div className="container">
        <div className="docs-grid">
          {/* Sidebar */}
          <aside className="docs-sidebar">
            <nav>
              {sections.map(section => (
                <button
                  key={section.id}
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="docs-content">
            {activeSection === 'overview' && (
              <section>
                <h1>TaoNet Documentation</h1>
                <p className="lead">
                  TaoNet is a decentralized AI inference network where miners contribute GPU 
                  compute power to process AI tasks and earn TAO rewards.
                </p>

                <div className="feature-grid">
                  <div className="feature-card">
                    <div className="feature-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
                      </svg>
                    </div>
                    <h3>Proof of Inference</h3>
                    <p>Every AI task creates a cryptographic proof, ensuring all work is verifiable.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                        <path d="M9 9h6v6H9z"/>
                      </svg>
                    </div>
                    <h3>Browser Mining</h3>
                    <p>Run AI inference directly in your browser using WebGPU. No setup required.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <h3>Instant Rewards</h3>
                    <p>Earn TAO immediately upon task completion. Higher tiers earn more.</p>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'getting-started' && (
              <section>
                <h1>Getting Started</h1>
                <p className="lead">Start mining in 3 simple steps.</p>

                <div className="step-list">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Connect Your Wallet</h3>
                      <p>
                        Click "Connect Wallet" and approve the connection in Phantom. 
                        Your wallet address becomes your miner identity.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Register as a Miner</h3>
                      <p>
                        Choose a name for your miner. This is how you'll appear on the 
                        leaderboard.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Start Mining</h3>
                      <p>
                        Click "Start Mining" to download the AI model (~500MB) and begin 
                        processing tasks. Mining continues even when you navigate to other pages.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="note">
                  <strong>Requirements:</strong> Chrome 113+ or Edge 113+ with WebGPU support. 
                  The AI model is cached after the first download.
                </div>
              </section>
            )}

            {activeSection === 'mining' && (
              <section>
                <h1>Mining</h1>
                <p className="lead">How AI inference mining works on TaoNet.</p>

                <h2>How It Works</h2>
                <ol>
                  <li>Connect to the network via WebSocket</li>
                  <li>Receive tasks containing AI prompts</li>
                  <li>Run inference locally using Llama 3.2 (1B parameters)</li>
                  <li>Submit response with processing metrics</li>
                  <li>Receive TAO rewards upon verification</li>
                </ol>

                <h2>Task Types</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Base Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Text</td>
                      <td>General text generation and Q&A</td>
                      <td>1.0 TAO</td>
                    </tr>
                    <tr>
                      <td>Code</td>
                      <td>Code generation and debugging</td>
                      <td>1.5 TAO</td>
                    </tr>
                    <tr>
                      <td>Creative</td>
                      <td>Stories, poems, creative writing</td>
                      <td>1.2 TAO</td>
                    </tr>
                  </tbody>
                </table>

                <h2>Reward Calculation</h2>
                <div className="code-block">
                  <code>
                    finalReward = baseReward * tierMultiplier * qualityScore
                  </code>
                </div>
              </section>
            )}

            {activeSection === 'proof-of-inference' && (
              <section>
                <h1>Proof of Inference</h1>
                <p className="lead">
                  A novel consensus mechanism that verifies AI work cryptographically.
                </p>

                <h2>How Proofs Work</h2>
                <p>
                  Every completed inference task generates a proof containing:
                </p>
                <ul>
                  <li><strong>Input Hash:</strong> SHA-256 of the prompt</li>
                  <li><strong>Output Hash:</strong> SHA-256 of the response</li>
                  <li><strong>Previous Hash:</strong> Link to the previous proof</li>
                  <li><strong>Block Hash:</strong> Combined hash of all fields</li>
                </ul>

                <h2>Verification</h2>
                <p>
                  Anyone can verify a proof by:
                </p>
                <ol>
                  <li>Recomputing the input/output hashes</li>
                  <li>Checking the chain linkage</li>
                  <li>Verifying the block hash computation</li>
                </ol>

                <div className="code-block">
                  <code>
{`GET /api/proofs/verify/:blockHash

Response:
{
  "verified": true,
  "proof": { ... },
  "checks": {
    "inputHashValid": true,
    "outputHashValid": true,
    "chainLinkValid": true
  }
}`}
                  </code>
                </div>
              </section>
            )}

            {activeSection === 'tiers' && (
              <section>
                <h1>Staking Tiers</h1>
                <p className="lead">
                  Stake TAO to increase your reward multiplier.
                </p>

                <table>
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Required Stake</th>
                      <th>Multiplier</th>
                      <th>Rate Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="tier bronze">Bronze</span></td>
                      <td>0 TAO</td>
                      <td>1.0x</td>
                      <td>10 RPM</td>
                    </tr>
                    <tr>
                      <td><span className="tier silver">Silver</span></td>
                      <td>10,000 TAO</td>
                      <td>1.25x</td>
                      <td>30 RPM</td>
                    </tr>
                    <tr>
                      <td><span className="tier gold">Gold</span></td>
                      <td>100,000 TAO</td>
                      <td>1.5x</td>
                      <td>60 RPM</td>
                    </tr>
                    <tr>
                      <td><span className="tier platinum">Platinum</span></td>
                      <td>1,000,000 TAO</td>
                      <td>2.0x</td>
                      <td>120 RPM</td>
                    </tr>
                    <tr>
                      <td><span className="tier diamond">Diamond</span></td>
                      <td>10,000,000 TAO</td>
                      <td>3.0x</td>
                      <td>300 RPM</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            {activeSection === 'api' && (
              <section>
                <h1>API Reference</h1>
                <p className="lead">
                  REST API for developers. Base URL: <code>https://api.taonet.fun</code>
                </p>

                <h2>Endpoints</h2>

                <div className="endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/api/stats</code>
                  </div>
                  <p>Get network statistics</p>
                </div>

                <div className="endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/api/miners/leaderboard</code>
                  </div>
                  <p>Get top miners sorted by rewards, tasks, or streak</p>
                </div>

                <div className="endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/api/proofs</code>
                  </div>
                  <p>List recent inference proofs</p>
                </div>

                <div className="endpoint">
                  <div className="endpoint-header">
                    <span className="method get">GET</span>
                    <code>/api/proofs/verify/:blockHash</code>
                  </div>
                  <p>Verify a proof cryptographically</p>
                </div>

                <div className="endpoint">
                  <div className="endpoint-header">
                    <span className="method post">POST</span>
                    <code>/api/miners/register</code>
                  </div>
                  <p>Register a new miner</p>
                </div>

                <h2>WebSocket</h2>
                <p>Connect to <code>wss://api.taonet.fun/ws</code> for real-time task streaming.</p>

                <div className="code-block">
                  <code>
{`// Connect and authenticate
ws.send(JSON.stringify({
  type: "auth",
  address: "your-wallet-address"
}));

// Receive tasks
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "task") {
    // Process msg.task.prompt
    // Send response back
  }
};`}
                  </code>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
