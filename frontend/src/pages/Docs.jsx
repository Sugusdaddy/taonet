import './Docs.css';

export default function Docs() {
  return (
    <main className="docs-page">
      <div className="container">
        <div className="docs-layout">
          {/* Sidebar */}
          <aside className="docs-sidebar">
            <nav className="docs-nav">
              <h4>Getting Started</h4>
              <a href="#overview" className="active">Overview</a>
              <a href="#quickstart">Quick Start</a>
              <a href="#wallet">Wallet Setup</a>
              
              <h4>Mining</h4>
              <a href="#browser">Browser Mining</a>
              <a href="#cli">CLI Miner</a>
              <a href="#sdk">SDK Integration</a>
              
              <h4>Rewards</h4>
              <a href="#earning">How Earning Works</a>
              <a href="#tiers">Tier System</a>
              <a href="#jackpots">Jackpots</a>
              
              <h4>API Reference</h4>
              <a href="#api-auth">Authentication</a>
              <a href="#api-endpoints">Endpoints</a>
            </nav>
          </aside>

          {/* Content */}
          <div className="docs-content">
            <section id="overview">
              <h1>TaoNet Documentation</h1>
              <p className="lead">
                TaoNet is a decentralized AI inference network built on Solana.
                Miners process AI tasks and earn tokens for their contributions.
              </p>
              
              <div className="info-box">
                <h4>What is TaoNet?</h4>
                <p>
                  TaoNet connects AI task requesters with distributed computing power.
                  When you run a miner, you process AI inference requests and earn tokens.
                </p>
              </div>
            </section>

            <section id="quickstart">
              <h2>Quick Start</h2>
              <p>Get started in under 5 minutes:</p>
              
              <div className="steps">
                <div className="doc-step">
                  <span className="step-num">1</span>
                  <div>
                    <h4>Connect Wallet</h4>
                    <p>Install Phantom and connect to TaoNet</p>
                  </div>
                </div>
                <div className="doc-step">
                  <span className="step-num">2</span>
                  <div>
                    <h4>Register</h4>
                    <p>Choose a display name for the leaderboard</p>
                  </div>
                </div>
                <div className="doc-step">
                  <span className="step-num">3</span>
                  <div>
                    <h4>Start Mining</h4>
                    <p>Use browser mining or install the CLI</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="browser">
              <h2>Browser Mining</h2>
              <p>The easiest way to start. Mine directly in your browser.</p>
              
              <div className="warning-box">
                <h4>Note</h4>
                <p>Browser mining has rate limits. For higher earnings, use the CLI miner.</p>
              </div>
              
              <ol className="doc-list">
                <li>Go to the Mine page</li>
                <li>Connect your wallet</li>
                <li>Register a miner name</li>
                <li>Click "Start Mining"</li>
              </ol>
            </section>

            <section id="cli">
              <h2>CLI Miner</h2>
              <p>For serious mining. Higher rate limits and better rewards.</p>
              
              <div className="code-block">
                <div className="code-header">Installation</div>
                <pre><code>npm install -g taonet-miner</code></pre>
              </div>
              
              <div className="code-block">
                <div className="code-header">Configuration</div>
                <pre><code>taonet-miner config --wallet YOUR_WALLET_ADDRESS</code></pre>
              </div>
              
              <div className="code-block">
                <div className="code-header">Start Mining</div>
                <pre><code>taonet-miner start</code></pre>
              </div>
            </section>

            <section id="tiers">
              <h2>Tier System</h2>
              <p>Hold more tokens to unlock higher earning multipliers.</p>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Tokens Required</th>
                      <th>Multiplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td><span className="badge badge-bronze">Bronze</span></td><td>Any</td><td>1x</td></tr>
                    <tr><td><span className="badge badge-silver">Silver</span></td><td>10,000</td><td>1.25x</td></tr>
                    <tr><td><span className="badge badge-gold">Gold</span></td><td>100,000</td><td>1.5x</td></tr>
                    <tr><td><span className="badge badge-platinum">Platinum</span></td><td>1,000,000</td><td>2x</td></tr>
                    <tr><td><span className="badge badge-diamond">Diamond</span></td><td>10,000,000</td><td>3x</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="api-endpoints">
              <h2>API Endpoints</h2>
              <p>Base URL: <code>https://api.taonet.fun</code></p>
              
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Method</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td><code>/health</code></td><td>GET</td><td>Health check</td></tr>
                    <tr><td><code>/api/stats</code></td><td>GET</td><td>Network statistics</td></tr>
                    <tr><td><code>/api/miners/leaderboard</code></td><td>GET</td><td>Top miners</td></tr>
                    <tr><td><code>/api/miners/register</code></td><td>POST</td><td>Register miner</td></tr>
                    <tr><td><code>/api/miners/:address</code></td><td>GET</td><td>Get miner info</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
