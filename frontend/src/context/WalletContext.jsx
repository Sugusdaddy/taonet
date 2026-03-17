import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  CloverWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  TokenPocketWalletAdapter,
  BitpieWalletAdapter,
  HuobiWalletAdapter,
  HyperPayWalletAdapter,
  KeystoneWalletAdapter,
  KrystalWalletAdapter,
  NekoWalletAdapter,
  NightlyWalletAdapter,
  NufiWalletAdapter,
  OntoWalletAdapter,
  ParticleAdapter,
  SaifuWalletAdapter,
  SalmonWalletAdapter,
  SkyWalletAdapter,
  SolongWalletAdapter,
  SpotWalletAdapter,
  TokenaryWalletAdapter,
  WalletConnectWalletAdapter,
  XDEFIWalletAdapter,
  TrezorWalletAdapter,
  AvanaWalletAdapter,
  BitKeepWalletAdapter,
  CoinhubWalletAdapter,
  FractalWalletAdapter
} from '@solana/wallet-adapter-wallets';
import api from '../api';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletContext = createContext(null);

// Solana RPC endpoint
const SOLANA_RPC = 'https://davidhu-mainnet-acbf.mainnet.rpcpool.com/3bfa8703-f9e6-4d3e-8b0b-f7c4ad2e4c0a';

function WalletContextProvider({ children }) {
  const { publicKey, connected, disconnect: solanaDisconnect, wallet: connectedWallet } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [miner, setMiner] = useState(null);
  const [loading, setLoading] = useState(true);

  const wallet = publicKey?.toString() || null;
  const isConnected = connected && !!publicKey;
  const walletName = connectedWallet?.adapter?.name || null;

  // Load miner data when wallet connects
  useEffect(() => {
    const loadMiner = async () => {
      if (wallet) {
        try {
          const minerData = await api.getMiner(wallet);
          if (minerData?.miner) {
            setMiner(minerData.miner);
            localStorage.setItem('taonet_miner', JSON.stringify(minerData.miner));
          } else {
            setMiner(null);
            localStorage.removeItem('taonet_miner');
          }
        } catch (e) {
          console.error('Error loading miner:', e);
        }
      } else {
        setMiner(null);
        localStorage.removeItem('taonet_miner');
      }
      setLoading(false);
    };

    loadMiner();
  }, [wallet]);

  const connect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const disconnect = useCallback(async () => {
    await solanaDisconnect();
    setMiner(null);
    localStorage.removeItem('taonet_wallet');
    localStorage.removeItem('taonet_miner');
  }, [solanaDisconnect]);

  const register = useCallback(async (name) => {
    if (!wallet) throw new Error('Wallet not connected');
    
    const result = await api.registerMiner(wallet, name);
    if (result?.miner) {
      setMiner(result.miner);
      localStorage.setItem('taonet_miner', JSON.stringify(result.miner));
      return result.miner;
    }
    throw new Error(result?.error || 'Registration failed');
  }, [wallet]);

  const refreshMiner = useCallback(async () => {
    if (!wallet) return;
    const minerData = await api.getMiner(wallet);
    if (minerData?.miner) {
      setMiner(minerData.miner);
      localStorage.setItem('taonet_miner', JSON.stringify(minerData.miner));
    }
  }, [wallet]);

  const value = useMemo(() => ({
    wallet,
    miner,
    isConnected,
    loading,
    walletName,
    connect,
    disconnect,
    register,
    refreshMiner
  }), [wallet, miner, isConnected, loading, walletName, connect, disconnect, register, refreshMiner]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }) {
  // Initialize all supported wallets
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new TrustWalletAdapter(),
    new LedgerWalletAdapter(),
    new TrezorWalletAdapter(),
    new TorusWalletAdapter(),
    new Coin98WalletAdapter(),
    new BitKeepWalletAdapter(),
    new SafePalWalletAdapter(),
    new TokenPocketWalletAdapter(),
    new CloverWalletAdapter(),
    new MathWalletAdapter(),
    new BitpieWalletAdapter(),
    new HuobiWalletAdapter(),
    new HyperPayWalletAdapter(),
    new KeystoneWalletAdapter(),
    new KrystalWalletAdapter(),
    new NekoWalletAdapter(),
    new NightlyWalletAdapter(),
    new NufiWalletAdapter(),
    new OntoWalletAdapter(),
    new SaifuWalletAdapter(),
    new SalmonWalletAdapter(),
    new SkyWalletAdapter(),
    new SolongWalletAdapter(),
    new SpotWalletAdapter(),
    new TokenaryWalletAdapter(),
    new XDEFIWalletAdapter(),
    new AvanaWalletAdapter(),
    new CoinhubWalletAdapter(),
    new FractalWalletAdapter()
  ], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}