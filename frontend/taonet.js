// TaoNet Global - Shared functionality across all pages
const TAONET = {
  API: 'https://api.taonet.fun',
  
  // Wallet state
  wallet: null,
  miner: null,
  
  // Initialize on page load
  async init() {
    // Try to restore wallet from localStorage
    const savedWallet = localStorage.getItem('taonet_wallet');
    if (savedWallet) {
      this.wallet = savedWallet;
    }
    
    // Try to restore miner
    const savedMiner = localStorage.getItem('taonet_miner');
    if (savedMiner) {
      try {
        this.miner = JSON.parse(savedMiner);
      } catch(e) {}
    }
    
    // Try Phantom auto-connect
    if (window.solana?.isPhantom) {
      try {
        // Check if already connected
        const resp = await window.solana.connect({ onlyIfTrusted: true });
        if (resp.publicKey) {
          this.wallet = resp.publicKey.toString();
          localStorage.setItem('taonet_wallet', this.wallet);
        }
      } catch(e) {
        // Not pre-approved, that's fine
      }
    }
    
    // Update UI
    this.updateWalletUI();
    
    return this;
  },
  
  // Connect wallet
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
      return this.wallet;
    } catch(e) {
      console.error('Wallet connect error:', e);
      return null;
    }
  },
  
  // Disconnect wallet
  disconnectWallet() {
    if (window.solana) {
      window.solana.disconnect();
    }
    this.wallet = null;
    this.miner = null;
    localStorage.removeItem('taonet_wallet');
    localStorage.removeItem('taonet_miner');
    this.updateWalletUI();
  },
  
  // Update wallet button across pages
  updateWalletUI() {
    const walletBtns = document.querySelectorAll('[data-wallet-btn]');
    walletBtns.forEach(btn => {
      if (this.wallet) {
        btn.textContent = this.wallet.slice(0, 4) + '...' + this.wallet.slice(-4);
        btn.classList.add('connected');
      } else {
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
      }
    });
    
    // Show/hide elements based on connection
    document.querySelectorAll('[data-show-connected]').forEach(el => {
      el.style.display = this.wallet ? '' : 'none';
    });
    document.querySelectorAll('[data-show-disconnected]').forEach(el => {
      el.style.display = this.wallet ? 'none' : '';
    });
  },
  
  // Get short address
  shortAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 4) + '...' + addr.slice(-4);
  },
  
  // Format number
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },
  
  // Format time ago
  timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  },
  
  // API helpers
  async fetchAPI(endpoint) {
    try {
      const res = await fetch(this.API + endpoint);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch(e) {
      console.error('API fetch error:', e);
      return null;
    }
  },
  
  async postAPI(endpoint, data) {
    try {
      const res = await fetch(this.API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch(e) {
      console.error('API post error:', e);
      return null;
    }
  },
  
  // Get miner data
  async getMiner(address) {
    const addr = address || this.wallet;
    if (!addr) return null;
    
    const data = await this.fetchAPI('/api/miners/' + addr);
    if (data?.miner) {
      this.miner = data.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(data.miner));
    }
    return data?.miner;
  },
  
  // Register miner
  async registerMiner(name) {
    if (!this.wallet) return { error: 'Wallet not connected' };
    
    const result = await this.postAPI('/api/miners/register', {
      address: this.wallet,
      name: name,
      signature: 'demo_' + Date.now()
    });
    
    if (result?.miner) {
      this.miner = result.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(result.miner));
    }
    
    return result;
  },
  
  // Get network stats
  async getStats() {
    return await this.fetchAPI('/api/stats');
  },
  
  // Get leaderboard
  async getLeaderboard(limit = 100) {
    return await this.fetchAPI('/api/miners/leaderboard?limit=' + limit);
  },
  
  // Get jackpots
  async getJackpots() {
    return await this.fetchAPI('/api/game/jackpots/active');
  },
  
  // Get achievements
  async getAchievements() {
    return await this.fetchAPI('/api/game/achievements');
  },
  
  // Get tournaments
  async getTournaments() {
    return await this.fetchAPI('/api/game/tournaments/active');
  }
};

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TAONET.init());
} else {
  TAONET.init();
}
