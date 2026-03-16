import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Mine from './pages/Mine';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Rewards from './pages/Rewards';
import Docs from './pages/Docs';
import Tournaments from './pages/Tournaments';
import Achievements from './pages/Achievements';
import Referrals from './pages/Referrals';
import Developers from './pages/Developers';
import './styles/index.css';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mine" element={<Mine />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/developers" element={<Developers />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </WalletProvider>
  );
}
