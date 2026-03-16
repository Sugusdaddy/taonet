import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [miner, setMiner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to reconnect on mount
    const init = async () => {
      const address = await api.tryReconnect();
      if (address) {
        setWallet(address);
        setIsConnected(true);
        const minerData = await api.getMiner(address);
        if (minerData?.miner) {
          setMiner(minerData.miner);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const connect = async () => {
    try {
      const address = await api.connectWallet();
      setWallet(address);
      setIsConnected(true);
      
      const minerData = await api.getMiner(address);
      if (minerData?.miner) {
        setMiner(minerData.miner);
      }
      return address;
    } catch (err) {
      console.error('Connect error:', err);
      throw err;
    }
  };

  const disconnect = async () => {
    await api.disconnectWallet();
    setWallet(null);
    setMiner(null);
    setIsConnected(false);
  };

  const register = async (name) => {
    if (!wallet) throw new Error('Wallet not connected');
    
    const result = await api.registerMiner(wallet, name);
    if (result?.miner) {
      setMiner(result.miner);
      return result.miner;
    }
    throw new Error(result?.error || 'Registration failed');
  };

  const refreshMiner = async () => {
    if (!wallet) return;
    const minerData = await api.getMiner(wallet);
    if (minerData?.miner) {
      setMiner(minerData.miner);
    }
  };

  const value = {
    wallet,
    miner,
    isConnected,
    loading,
    connect,
    disconnect,
    register,
    refreshMiner
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
