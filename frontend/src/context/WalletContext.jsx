import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [miner, setMiner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to reconnect on mount
    api.tryReconnect().then(addr => {
      if (addr) {
        setWallet(addr);
        setMiner(api.miner);
      }
      setLoading(false);
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      const addr = await api.connectWallet();
      setWallet(addr);
      setMiner(api.miner);
      return addr;
    } catch (err) {
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await api.disconnectWallet();
    setWallet(null);
    setMiner(null);
  }, []);

  const refreshMiner = useCallback(async () => {
    if (!wallet) return;
    const data = await api.getMiner(wallet);
    if (data?.miner) {
      setMiner(data.miner);
      api.miner = data.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(data.miner));
    }
  }, [wallet]);

  const registerMiner = useCallback(async (name) => {
    if (!wallet) throw new Error('Wallet not connected');
    const result = await api.registerMiner(wallet, name);
    if (result?.miner) {
      setMiner(result.miner);
      api.miner = result.miner;
      localStorage.setItem('taonet_miner', JSON.stringify(result.miner));
    }
    return result;
  }, [wallet]);

  return (
    <WalletContext.Provider value={{
      wallet,
      miner,
      loading,
      connect,
      disconnect,
      refreshMiner,
      registerMiner,
      isConnected: !!wallet
    }}>
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
