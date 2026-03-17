import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { MiningProvider } from './context/MiningContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SupportChat from './components/SupportChat';
import Home from './pages/Home';
import Mine from './pages/Mine';
import Dashboard from './pages/Dashboard';
import Explorer from './pages/Explorer';
import Leaderboard from './pages/Leaderboard';
import Playground from './pages/Playground';
import Validators from './pages/Validators';
import Docs from './pages/Docs';
import Achievements from './pages/Achievements';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isDocsPage = location.pathname.startsWith('/docs');

  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mine" element={<Mine />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/validators" element={<Validators />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:section" element={<Docs />} />
        <Route path="/achievements" element={<Achievements />} />
      </Routes>
      {!isDocsPage && <Footer />}
      <SupportChat />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <MiningProvider>
          <AppContent />
        </MiningProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}