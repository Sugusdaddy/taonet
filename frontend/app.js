/**
 * TaoNet - Global Application Module
 * Handles wallet, API, state management
 */

const TAONET = {
  // Configuration
  API_URL: 'https://api.taonet.fun',
  
  // State
  wallet: null,
  miner: null,
  
  // Initialize
  async init() {
    // Restore wallet from localStorage
    const savedWallet = localStorage.getItem('taonet_wallet');
    if (savedWallet) {
      this.wallet = savedWallet;
      // Try to auto-reconnect Phantom
      if (window.solana?.isPhantom) {
        try {
          const resp = await window.solana.connect({ onlyIfTrusted: true });
          this.wallet = resp.publicKey.toString();
          localStorage.setItem('taonet_wallet', this.wallet);
        } catch (e) {
          // User hasn't trusted yet, keep saved wallet
        }
      }
    }
    
    // Restore miner data
    const savedMiner = localStorage.getItem('taonet_miner');
    if (savedMiner) {
      try {
        this.miner = JSON.parse(savedMiner);
      } catch (e) {}
    }
    
    // Update UI
    this.updateWalletUI();
    
    // Fetch fresh miner data if connected
    if (this.wallet) {
      this.refreshMiner();
    }
    
    return this;
  },
  
  // Wallet Connection
  async connectWallet() {
    if (!window.solana?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return null;
    }
    
    try {
      const resp = await window.solana.connect();
      this.wallet = resp.publicKey.toString();
      localStorage.setItem('taonet_wallet', this.wallet);
      this.updateWalletUI();
      await this.refreshMiner();
      return this.wallet;
    } catch (err) {
      console.error('Wallet connection failed:', err);
      return null;
    }
  },
  
  disconnectWallet() {
    this.wallet = null;
    this.miner = null;
    localStorage.removeItem('taonet_wallet');
    localStorage.removeItem('taonet_miner');
    if (window.solana?.disconnect) {
      window.solana.disconnect();
    }
    this.updateWalletUI();
  },
  
  updateWalletUI() {
    const btns = document.querySelectorAll('[data-wallet-btn]');
    btns.forEach(btn => {
      if (this.wallet) {
        btn.textContent = this.shortAddress(this.wallet);
        btn.classList.add('connected');
      } else {
        btn.textContent = 'Connect';
        btn.classList.remove('connected');
      }
    });
    
    // Show/hide elements based on connection
    document.querySelectorAll('[data-show-connected]').forEach(el => {
      el.classList.toggle('hidden', !this.wallet);
    });
    document.querySelectorAll('[data-show-disconnected]').forEach(el => {
      el.classList.toggle('hidden', !!this.wallet);
    });
  },
  
  // API Methods
  async api(endpoint, options = {}) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.API_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || 'API Error');
      }
      
      return await response.json();
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      return null;
    }
  },
  
  async get(endpoint) {
    return this.api(endpoint);
  },
  
  async post(endpoint, data) {
    return this.api(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // Miner Methods
  async refreshMiner() {
    if (!this.wallet) return null;
    
    const data = await this.get(`/api/miners/${this.wallet}`);
    if (data?.miner) {
      this.miner = data.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(this.miner));
    }
    return this.miner;
  },
  
  async registerMiner(name) {
    if (!this.wallet) {
      const connected = await this.connectWallet();
      if (!connected) return { error: 'Wallet not connected' };
    }
    
    const data = await this.post('/api/miners/register', {
      address: this.wallet,
      name: name
    });
    
    if (data?.miner) {
      this.miner = data.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(this.miner));
    }
    
    return data;
  },
  
  // Data Fetching
  async getStats() {
    return this.get('/api/stats');
  },
  
  async getLeaderboard(sort = 'totalRewards', limit = 100) {
    return this.get(`/api/miners/leaderboard?sort=${sort}&limit=${limit}`);
  },
  
  async getJackpots() {
    return this.get('/api/game/jackpots/active');
  },
  
  async getAchievements() {
    return this.get('/api/game/achievements');
  },
  
  async getTournaments() {
    return this.get('/api/game/tournaments/active');
  },
  
  async getHealth() {
    return this.get('/health');
  },
  
  // Mining
  async getNextTask() {
    if (!this.wallet) return null;
    return this.get(`/api/tasks/next?minerId=${this.wallet}`);
  },
  
  async submitTask(taskId, result) {
    return this.post(`/api/tasks/${taskId}/complete`, {
      minerId: this.wallet,
      result: result
    });
  },
  
  // Utility Functions
  shortAddress(addr) {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  },
  
  formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  },
  
  formatTokens(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
  },
  
  timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  },
  
  getTierInfo(tier) {
    const tiers = {
      bronze: { name: 'Bronze', mult: 1.0, next: 10000, nextTier: 'silver' },
      silver: { name: 'Silver', mult: 1.25, next: 100000, nextTier: 'gold' },
      gold: { name: 'Gold', mult: 1.5, next: 1000000, nextTier: 'platinum' },
      platinum: { name: 'Platinum', mult: 2.0, next: 10000000, nextTier: 'diamond' },
      diamond: { name: 'Diamond', mult: 3.0, next: null, nextTier: null }
    };
    return tiers[tier?.toLowerCase()] || tiers.bronze;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TAONET.init());
} else {
  TAONET.init();
}

// Mobile menu toggle
function toggleMenu() {
  document.querySelector('.nav')?.classList.toggle('open');
}

// Wallet button handler
async function handleWalletClick() {
  if (TAONET.wallet) {
    TAONET.disconnectWallet();
  } else {
    await TAONET.connectWallet();
  }
}
