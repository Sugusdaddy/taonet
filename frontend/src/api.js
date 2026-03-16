const API_URL = import.meta.env.VITE_API_URL || 'https://api.taonet.fun/api';

const api = {
  // Network stats
  async getNetworkStats() {
    const res = await fetch(`${API_URL}/stats`);
    return res.json();
  },
  
  // Miners
  async registerMiner(address, name, referralCode) {
    const res = await fetch(`${API_URL}/miners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, name, referralCode })
    });
    return res.json();
  },
  
  async getMiner(address) {
    const res = await fetch(`${API_URL}/miners/${address}`);
    return res.json();
  },
  
  async getLeaderboard() {
    const res = await fetch(`${API_URL}/miners/leaderboard`);
    return res.json();
  },
  
  // Proofs
  async getProofs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/proofs?${query}`);
    return res.json();
  },
  
  async getProof(id) {
    const res = await fetch(`${API_URL}/proofs/${id}`);
    return res.json();
  },
  
  async verifyProof(hash) {
    const res = await fetch(`${API_URL}/proofs/verify/${hash}`);
    return res.json();
  },
  
  // Playground
  async queryPlayground(prompt, address) {
    const res = await fetch(`${API_URL}/playground/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, address })
    });
    return res.json();
  },
  
  async getPlaygroundStats() {
    const res = await fetch(`${API_URL}/playground/stats`);
    return res.json();
  },
  
  async getKnowledge(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/playground/knowledge?${query}`);
    return res.json();
  },
  
  // Gamification
  async getAchievements() {
    const res = await fetch(`${API_URL}/game/achievements`);
    return res.json();
  },
  
  async getJackpots() {
    const res = await fetch(`${API_URL}/game/jackpots`);
    return res.json();
  },
  
  // Referrals
  async applyReferral(code, address) {
    const res = await fetch(`${API_URL}/referral/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, address })
    });
    return res.json();
  },
  
  // Helpers
  shortAddress(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
};

export default api;
