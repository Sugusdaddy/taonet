import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import api from '../api';
import './Developers.css';

export default function Developers() {
  const { wallet, isConnected, connect } = useWallet();
  const [keys, setKeys] = useState([]);

  useEffect(() => {
    if (isConnected) loadKeys();
  }, [isConnected]);

  async function loadKeys() {
    const data = await api.get(`/api/keys?address=${wallet}`);
    if (data?.keys) setKeys(data.keys);
  }

  async function generateKey() {
    const data = await api.post('/api/keys/generate', { address: wallet });
    if (data?.key) {
      alert('New API key: ' + data.key);
      loadKeys();
    }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key);
    alert('API key copied!');
  }

  if (!isConnected) {
    return (
      <main className="developers-page">
        <div className="container">
          <div className="empty-state">
            <h2>Connect to Access API Keys</h2>
            <p>Connect your wallet to generate API keys</p>
            <button className="btn btn-primary mt-lg" onClick={connect}>Connect Wallet</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="developers-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Developer Portal</h1>
          <p className="page-subtitle">Build with the TaoNet API</p>
        </div>

        {/* API Keys */}
        <div className="card mb-lg">
          <div className="card-header">
            <h3 className="card-title">Your API Keys</h3>
            <button className="btn btn-primary btn-sm" onClick={generateKey}>Generate Key</button>
          </div>
          
          {keys.length > 0 ? (
            <div className="keys-list">
              {keys.map((key, i) => (
                <div key={i} className="key-item">
                  <div>
                    <code className="key-value">
                      {key.key.substring(0, 16)}...{key.key.substring(key.key.length - 8)}
                    </code>
                    <div className="key-meta">Created {api.timeAgo(key.createdAt)}</div>
                  </div>
                  <div className="key-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => copyKey(key.key)}>Copy</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-tertiary">No API keys yet. Generate one to get started.</p>
          )}
        </div>

        {/* Quick Reference */}
        <div className="card mb-lg">
          <h3 className="card-title mb-lg">Quick Reference</h3>
          <p className="text-secondary mb-md">Base URL: <code>https://api.taonet.fun</code></p>
          
          <div className="code-block mb-md">
            <div className="code-header">Authentication</div>
            <pre><code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.taonet.fun/api/stats`}</code></pre>
          </div>
          
          <div className="code-block">
            <div className="code-header">Get Next Task</div>
            <pre><code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://api.taonet.fun/api/tasks/next?minerId=YOUR_WALLET"`}</code></pre>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="card">
          <h3 className="card-title mb-lg">Rate Limits</h3>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Requests/Min</th>
                  <th>Requests/Day</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><span className="badge badge-bronze">Bronze</span></td><td>30</td><td>1,000</td></tr>
                <tr><td><span className="badge badge-silver">Silver</span></td><td>60</td><td>5,000</td></tr>
                <tr><td><span className="badge badge-gold">Gold</span></td><td>120</td><td>20,000</td></tr>
                <tr><td><span className="badge badge-platinum">Platinum</span></td><td>300</td><td>100,000</td></tr>
                <tr><td><span className="badge badge-diamond">Diamond</span></td><td>600</td><td>500,000</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
