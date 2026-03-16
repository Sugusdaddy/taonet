import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { MiningProvider } from './context/MiningContext';
import Navbar from './components/Navbar';
import SupportChat from './components/SupportChat';
import Home from './pages/Home';
import Mine from './pages/Mine';
import Dashboard from './pages/Dashboard';
import Explorer from './pages/Explorer';
import Leaderboard from './pages/Leaderboard';
import Playground from './pages/Playground';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <MiningProvider>
          <div className="app">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mine" element={<Mine />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/playground" element={<Playground />} />
            </Routes>
            <SupportChat />
          </div>
        </MiningProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
