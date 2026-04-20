import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Play from './screens/Play';
import Cashout from './screens/Cashout';
import Invest from './screens/Invest';

export default function App() {
  const profile = useStore((s) => s.profile);
  const applyInterest = useStore((s) => s.applyInterest);
  const initCloud = useStore((s) => s.initCloud);
  const syncToCloud = useStore((s) => s.syncToCloud);
  const earnings = useStore((s) => s.earnings);
  const transactions = useStore((s) => s.transactions);
  const investedCents = useStore((s) => s.investedCents);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init cloud on first load
  useEffect(() => {
    applyInterest();
    initCloud();
  }, []);

  // Debounced sync whenever meaningful state changes
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { syncToCloud(); }, 3000);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [earnings, transactions, investedCents]);

  return (
    <Routes>
      <Route
        path="/"
        element={profile ? <Home /> : <Navigate to="/onboarding" replace />}
      />
      <Route
        path="/onboarding"
        element={profile ? <Navigate to="/" replace /> : <Onboarding />}
      />
      <Route path="/play/:subject" element={profile ? <Play /> : <Navigate to="/onboarding" replace />} />
      <Route path="/cashout" element={profile ? <Cashout /> : <Navigate to="/onboarding" replace />} />
      <Route path="/invest" element={profile ? <Invest /> : <Navigate to="/onboarding" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
