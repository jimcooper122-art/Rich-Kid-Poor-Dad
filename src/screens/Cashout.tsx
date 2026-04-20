import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { sounds } from '../lib/sounds';
import { formatBig, formatMoney } from '../lib/format';

type Phase = 'celebration' | 'pin' | 'amount' | 'confirmed';

export default function Cashout() {
  const navigate = useNavigate();
  const earnings = useStore((s) => s.earnings);
  const verifyPin = useStore((s) => s.verifyPin);
  const requestCashout = useStore((s) => s.requestCashout);
  const resetProfile = useStore((s) => s.resetProfile);
  const transactions = useStore((s) => s.transactions);
  const soundEnabled = useStore((s) => s.soundEnabled);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
    sounds.chaChing();
  }, []);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const [phase, setPhase] = useState<Phase>('celebration');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidCents, setPaidCents] = useState(0);

  const requested = earnings.cashoutBalanceCents;

  const handlePinSubmit = () => {
    if (verifyPin(pin)) {
      sounds.pinOk();
      setPhase('amount');
      setPaidAmount((requested / 100).toFixed(2));
      setPinError(false);
    } else {
      sounds.pinWrong();
      setPinError(true);
      setPin('');
    }
  };

  const handleConfirm = () => {
    const dollars = parseFloat(paidAmount);
    if (isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    setPaidCents(cents);
    requestCashout(requested, cents);
    setPhase('confirmed');
    sounds.chaChing();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {phase === 'celebration' && (
            <motion.div
              key="celebration"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 0.5 }}
                className="text-9xl mb-4"
              >
                💰
              </motion.div>
              <div className="font-display text-4xl md:text-5xl mb-3">YOU'VE EARNED</div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="font-display text-8xl md:text-9xl text-electric-yellow drop-shadow-lg mb-6"
              >
                {formatBig(requested)}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-4"
              >
                <div className="text-2xl opacity-90">Get Dad to approve!</div>
                <button
                  onClick={() => setPhase('pin')}
                  className="btn-pop bg-electric-yellow text-ink font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  DAD IS HERE →
                </button>
                <div>
                  <button
                    onClick={() => navigate('/')}
                    className="text-sm opacity-60 underline mt-3"
                  >
                    cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {phase === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-5xl mb-2">Dad's Turn</div>
              <p className="text-xl mb-6 opacity-80">Type your 4-digit PIN</p>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4) handlePinSubmit();
                }}
                placeholder="••••"
                autoFocus
                maxLength={4}
                className={`w-48 text-6xl text-center py-4 rounded-2xl bg-white text-ink font-bold border-4 shadow-pop focus:outline-none tracking-[0.5em] ${
                  pinError ? 'border-red-500 animate-shake' : 'border-white focus:border-electric-yellow'
                }`}
              />
              {pinError && (
                <div className="mt-3 text-red-300 font-semibold">Wrong PIN. Try again.</div>
              )}
              <div className="mt-8 space-x-3">
                <button
                  onClick={() => navigate('/')}
                  className="btn-pop bg-white/20 font-semibold text-lg px-6 py-3 rounded-xl hover:bg-white/30 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={pin.length !== 4}
                  onClick={handlePinSubmit}
                  className="btn-pop bg-money-bright font-display text-2xl px-8 py-3 rounded-xl shadow-pop-sm disabled:opacity-40 hover:scale-105 transition"
                >
                  APPROVE
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-4xl mb-2">How much are you paying?</div>
              <p className="text-lg mb-2 opacity-80">
                Balance owed: <strong>{formatBig(requested)}</strong>
              </p>
              <p className="text-sm mb-6 opacity-70">
                Pay any amount — extra rolls forward as credit, less stays in balance.
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-display text-5xl">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && paidAmount) handleConfirm();
                  }}
                  className="w-48 text-5xl text-center py-3 rounded-2xl bg-white text-ink font-bold border-4 border-white shadow-pop focus:outline-none focus:border-electric-yellow"
                />
              </div>
              <div className="mt-6 text-sm opacity-70">
                Quick: {[1, 2, 5, 10].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPaidAmount(d.toFixed(2))}
                    className="mx-1 px-3 py-1 bg-white/15 rounded-lg hover:bg-white/25"
                  >
                    ${d}
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <button
                  onClick={handleConfirm}
                  className="btn-pop bg-electric-yellow text-ink font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  CONFIRM PAYMENT
                </button>
              </div>
              <div className="mt-12 pt-6 border-t border-white/10 text-center">
                <button
                  onClick={() => {
                    if (window.confirm('Reset everything? This permanently wipes all progress and earnings.')) {
                      resetProfile();
                      navigate('/');
                    }
                  }}
                  className="text-xs text-red-300 opacity-50 hover:opacity-100 underline transition"
                >
                  Reset Game (wipes all progress)
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-9xl mb-4"
              >
                🎉
              </motion.div>
              <div className="font-display text-4xl mb-2">Dad paid you</div>
              <div className="font-display text-9xl text-electric-yellow drop-shadow-lg mb-4">
                {formatBig(paidCents)}
              </div>
              {paidCents !== requested && (
                <div className="text-lg opacity-80 mb-4">
                  {paidCents > requested
                    ? `Nice — Dad gave you an extra ${formatMoney(paidCents - requested)}! New balance: ${formatBig(Math.max(0, earnings.cashoutBalanceCents))}`
                    : `${formatMoney(requested - paidCents)} still in your balance for next time.`}
                </div>
              )}
              <button
                onClick={() => navigate('/')}
                className="mt-4 btn-pop bg-money-bright font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                BACK TO HOME
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction history */}
        {phase === 'celebration' && transactions.length > 0 && (
          <div className="mt-12 card p-5">
            <div className="font-display text-xl mb-3 opacity-80">Past cash outs</div>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between text-sm opacity-90">
                  <span>{new Date(t.date).toLocaleDateString()}</span>
                  <span className="font-bold">{formatBig(t.amountCents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
