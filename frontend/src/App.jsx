import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { MiningProvider } from './context/MiningContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Mine from './pages/Mine';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Explorer from './pages/Explorer';
import Rewards from './pages/Rewards';
import Playground from './pages/Playground';
import Docs from './pages/Docs';
import './styles/index.css';

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <MiningProvider>
          <div className="app">
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/mine" element={<Mine />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/explorer" element={<Explorer />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/docs" element={<Docs />} />
            </Routes>
            <Footer />
          </div>
        </MiningProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
