const API_URL = 'https://api.taonet.fun';

class TaoNetAPI {
  constructor() {
    this.wallet = localStorage.getItem('taonet_wallet');
    this.miner = JSON.parse(localStorage.getItem('taonet_miner') || 'null');
  }

  async get(endpoint) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  async post(endpoint, data) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  // Stats & Network
  async getStats() {
    return this.get('/api/stats');
  }
  
  // Alias
  async getNetworkStats() {
    return this.getStats();
  }

  async getHealth() {
    return this.get('/health');
  }

  async getActivity(limit = 20) {
    return this.get(`/api/activity?limit=${limit}`);
  }
  
  // Proofs
  async getProofs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/proofs?${query}`) || { proofs: [] };
  }

  // Miners
  async getLeaderboard(sort = 'composite', limit = 50, timeframe = 'all') {
    return this.get(`/api/miners/leaderboard?sortBy=${sort}&limit=${limit}&timeframe=${timeframe}`);
  }

  async getMiner(address) {
    return this.get(`/api/miners/${address}`);
  }

  async registerMiner(address, name) {
    return this.post('/api/miners/register', { address, name });
  }

  async getMinerDashboard(address) {
    return this.get(`/api/miners/${address}/dashboard`);
  }

  async getMinerHistory(address, page = 1, limit = 20) {
    return this.get(`/api/miners/${address}/history?page=${page}&limit=${limit}`);
  }

  // Gamification
  async getJackpots() {
    return this.get('/api/game/jackpots/active') || { jackpots: [] };
  }

  async getAchievements() {
    return this.get('/api/game/achievements') || { achievements: [] };
  }

  async getTournaments() {
    return this.get('/api/tournaments/active') || { tournaments: [] };
  }
  
  // Playground
  async queryPlayground(prompt, address) {
    return this.post('/api/playground/query', { prompt, address });
  }
  
  async getPlaygroundStats() {
    return this.get('/api/playground/stats');
  }

  // Wallet Management
  async connectWallet() {
    if (!window.solana?.isPhantom) {
      throw new Error('Phantom wallet not found. Install it from phantom.app');
    }

    const resp = await window.solana.connect();
    const address = resp.publicKey.toString();
    
    this.wallet = address;
    localStorage.setItem('taonet_wallet', address);
    
    const minerData = await this.getMiner(address);
    if (minerData?.miner) {
      this.miner = minerData.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(this.miner));
    } else {
      this.miner = null;
      localStorage.removeItem('taonet_miner');
    }
    
    return address;
  }

  async disconnectWallet() {
    if (window.solana?.isPhantom) {
      await window.solana.disconnect();
    }
    this.wallet = null;
    this.miner = null;
    localStorage.removeItem('taonet_wallet');
    localStorage.removeItem('taonet_miner');
  }

  async tryReconnect() {
    if (!window.solana?.isPhantom) return null;
    
    try {
      const resp = await window.solana.connect({ onlyIfTrusted: true });
      const address = resp.publicKey.toString();
      this.wallet = address;
      localStorage.setItem('taonet_wallet', address);
      
      const minerData = await this.getMiner(address);
      if (minerData?.miner) {
        this.miner = minerData.miner;
        localStorage.setItem('taonet_miner', JSON.stringify(this.miner));
      } else {
        this.miner = null;
        localStorage.removeItem('taonet_miner');
      }
      
      return address;
    } catch {
      return null;
    }
  }

  // Utilities
  shortAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  formatNumber(num) {
    if (!num) return '0';
    try {
      const n = typeof num === 'string' ? parseFloat(num) : num;
      if (isNaN(n)) return '0';
      // If it looks like wei (very large number), convert
      if (n >= 1e15) {
        const tokens = n / 1e18;
        if (tokens >= 1e9) return (tokens / 1e9).toFixed(1) + 'B';
        if (tokens >= 1e6) return (tokens / 1e6).toFixed(1) + 'M';
        if (tokens >= 1e3) return (tokens / 1e3).toFixed(1) + 'K';
        if (tokens >= 1) return tokens.toFixed(2);
        return tokens.toFixed(4);
      }
      // Regular number
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return n.toLocaleString();
    } catch {
      return '0';
    }
  }

  timeAgo(date) {
    if (!date) return '';
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getTierInfo(balance) {
    const b = Number(balance || 0);
    if (b >= 10000000) return { tier: 'diamond', mult: 3.0, next: null };
    if (b >= 1000000) return { tier: 'platinum', mult: 2.0, next: { tier: 'diamond', need: 10000000 } };
    if (b >= 100000) return { tier: 'gold', mult: 1.5, next: { tier: 'platinum', need: 1000000 } };
    if (b >= 10000) return { tier: 'silver', mult: 1.25, next: { tier: 'gold', need: 100000 } };
    return { tier: 'bronze', mult: 1.0, next: { tier: 'silver', need: 10000 } };
  }
}

export const api = new TaoNetAPI();
export default api;
