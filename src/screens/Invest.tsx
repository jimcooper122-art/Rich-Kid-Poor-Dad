import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { sounds } from '../lib/sounds';
import { formatBig, formatMoney } from '../lib/format';

type Phase = 'overview' | 'deposit' | 'deposited' | 'withdraw_pin' | 'withdrawn';

export default function Invest() {
  const navigate = useNavigate();
  const earnings = useStore((s) => s.earnings);
  const investedCents = useStore((s) => s.investedCents);
  const investmentPrincipal = useStore((s) => s.investmentPrincipal);
  const investmentRatePerHour = useStore((s) => s.investmentRatePerHour);
  const lastInterestAt = useStore((s) => s.lastInterestAt);
  const invest = useStore((s) => s.invest);
  const withdrawInvestment = useStore((s) => s.withdrawInvestment);
  const applyInterest = useStore((s) => s.applyInterest);
  const verifyPin = useStore((s) => s.verifyPin);
  const soundEnabled = useStore((s) => s.soundEnabled);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
    applyInterest();
  }, []);

  const hasInvestment = investedCents > 0;
  const [phase, setPhase] = useState<Phase>(hasInvestment ? 'overview' : 'deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const interestEarned = investedCents - investmentPrincipal;
  const hourlyRatePct = investmentRatePerHour * 100; // e.g. 0.5

  // Hours since last interest application (for display)
  const hoursSinceUpdate = lastInterestAt > 0
    ? Math.floor((Date.now() - lastInterestAt) / (1000 * 60 * 60))
    : 0;

  const handleDeposit = () => {
    const dollars = parseFloat(depositAmount);
    if (isNaN(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);
    if (cents > earnings.cashoutBalanceCents) return;
    invest(cents);
    sounds.chaChing();
    setPhase('deposited');
  };

  const handleWithdrawPin = () => {
    if (verifyPin(pin)) {
      sounds.pinOk();
      withdrawInvestment();
      setPhase('withdrawn');
      setPinError(false);
    } else {
      sounds.pinWrong();
      setPinError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {phase === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="text-7xl mb-3">📈</div>
              <div className="font-display text-4xl md:text-5xl mb-1">DAD'S BANK</div>
              <div className="text-lg opacity-80 mb-6">
                {hourlyRatePct}% per hour of play — guaranteed
              </div>

              {/* Portfolio card */}
              <div className="card p-8 mb-6 bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-pop">
                <div className="text-sm uppercase tracking-wider opacity-80 mb-1">Current value</div>
                <motion.div
                  key={investedCents}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="font-display text-7xl md:text-8xl text-electric-yellow drop-shadow-lg"
                >
                  {formatBig(investedCents)}
                </motion.div>
                <div className="mt-3 flex items-center justify-center gap-6 text-sm opacity-90">
                  <div>
                    <div className="opacity-70">Invested</div>
                    <div className="font-bold">{formatBig(investmentPrincipal)}</div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div>
                    <div className="opacity-70">Interest earned</div>
                    <div className="font-bold text-electric-yellow">
                      +{formatMoney(interestEarned)}
                    </div>
                  </div>
                </div>
                {hoursSinceUpdate > 0 && (
                  <div className="mt-3 text-sm opacity-70">
                    Last updated {hoursSinceUpdate} hour{hoursSinceUpdate !== 1 ? 's' : ''} ago
                  </div>
                )}
              </div>

              <div className="text-base opacity-80 mb-6">
                Earns {hourlyRatePct}% every hour the app is open.
                <br />
                <span className="opacity-60 text-sm">Withdrawals need Dad's PIN.</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {earnings.cashoutBalanceCents > 0 && (
                  <button
                    onClick={() => {
                      sounds.click();
                      setDepositAmount('');
                      setPhase('deposit');
                    }}
                    className="btn-pop bg-emerald-500 font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                  >
                    + INVEST MORE
                  </button>
                )}
                <button
                  onClick={() => {
                    sounds.click();
                    setPin('');
                    setPinError(false);
                    setPhase('withdraw_pin');
                  }}
                  className="btn-pop bg-white/20 font-display text-xl px-8 py-3 rounded-2xl hover:bg-white/30 transition"
                >
                  Withdraw
                </button>
              </div>

              <div className="mt-6">
                <button onClick={() => navigate('/')} className="text-sm opacity-50 underline">
                  ← Back to Home
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DEPOSIT ── */}
          {phase === 'deposit' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="text-7xl mb-3">🏦</div>
              <div className="font-display text-4xl mb-2">
                {hasInvestment ? 'INVEST MORE' : 'START INVESTING'}
              </div>
              <div className="text-lg opacity-80 mb-1">
                Your balance: <strong>{formatBig(earnings.cashoutBalanceCents)}</strong>
              </div>
              <div className="text-sm opacity-60 mb-6">
                Earns {hourlyRatePct}% per hour the app is open.
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="font-display text-5xl">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && depositAmount) handleDeposit();
                  }}
                  className="w-48 text-5xl text-center py-3 rounded-2xl bg-white text-ink font-bold border-4 border-white shadow-pop focus:outline-none focus:border-electric-yellow"
                />
              </div>

              {/* Quick amounts */}
              <div className="mb-6 text-sm opacity-70">
                Quick:{' '}
                {[0.25, 0.50, 1, 2].map((d) => {
                  const cents = Math.round(d * 100);
                  if (cents > earnings.cashoutBalanceCents) return null;
                  return (
                    <button
                      key={d}
                      onClick={() => setDepositAmount(d.toFixed(2))}
                      className="mx-1 px-3 py-1 bg-white/15 rounded-lg hover:bg-white/25"
                    >
                      ${d.toFixed(2)}
                    </button>
                  );
                })}
                {earnings.cashoutBalanceCents > 0 && (
                  <button
                    onClick={() => setDepositAmount((earnings.cashoutBalanceCents / 100).toFixed(2))}
                    className="mx-1 px-3 py-1 bg-white/15 rounded-lg hover:bg-white/25"
                  >
                    All
                  </button>
                )}
              </div>

              {/* Growth preview */}
              {depositAmount && !isNaN(parseFloat(depositAmount)) && parseFloat(depositAmount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-emerald-600/40 rounded-2xl p-4 text-sm"
                >
                  <div className="opacity-80 mb-1">After this many hours of play...</div>
                  {[
                    { label: '2 hours', hours: 2 },
                    { label: '10 hours', hours: 10 },
                    { label: '20 hours', hours: 20 },
                  ].map(({ label, hours }) => {
                    const base = Math.round(parseFloat(depositAmount) * 100);
                    const value = Math.floor(base * Math.pow(1 + investmentRatePerHour, hours));
                    return (
                      <div key={label} className="flex justify-between">
                        <span className="opacity-70">{label}</span>
                        <span className="font-bold text-electric-yellow">{formatBig(value)}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              <button
                disabled={
                  !depositAmount ||
                  isNaN(parseFloat(depositAmount)) ||
                  parseFloat(depositAmount) <= 0 ||
                  Math.round(parseFloat(depositAmount) * 100) > earnings.cashoutBalanceCents
                }
                onClick={handleDeposit}
                className="btn-pop bg-emerald-500 font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                INVEST 📈
              </button>

              <div className="mt-6">
                <button
                  onClick={() => {
                    sounds.click();
                    hasInvestment ? setPhase('overview') : navigate('/');
                  }}
                  className="text-sm opacity-50 underline"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DEPOSITED ── */}
          {phase === 'deposited' && (
            <motion.div
              key="deposited"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 0.6 }}
                className="text-9xl mb-4"
              >
                📈
              </motion.div>
              <div className="font-display text-4xl mb-2">MONEY INVESTED!</div>
              <div className="font-display text-6xl text-electric-yellow drop-shadow-lg mb-4">
                {formatBig(investedCents)}
              </div>
              <div className="text-lg opacity-80 mb-6">
                Earning {hourlyRatePct}% per hour you play in Dad's Bank.
                <br />
                <span className="opacity-60">The more you play, the more it grows!</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    sounds.click();
                    navigate('/');
                  }}
                  className="btn-pop bg-emerald-500 font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  BACK TO HOME
                </button>
              </div>
            </motion.div>
          )}

          {/* ── WITHDRAW PIN ── */}
          {phase === 'withdraw_pin' && (
            <motion.div
              key="withdraw_pin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-5xl mb-2">Dad's Turn</div>
              <p className="text-lg opacity-80 mb-2">
                Withdrawing <strong>{formatBig(investedCents)}</strong>
              </p>
              <p className="text-sm opacity-60 mb-6">
                (includes {formatMoney(interestEarned)} interest earned!)
              </p>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setPinError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4) handleWithdrawPin();
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
                  onClick={() => {
                    sounds.click();
                    setPhase('overview');
                  }}
                  className="btn-pop bg-white/20 font-semibold text-lg px-6 py-3 rounded-xl hover:bg-white/30 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={pin.length !== 4}
                  onClick={handleWithdrawPin}
                  className="btn-pop bg-emerald-500 font-display text-2xl px-8 py-3 rounded-xl shadow-pop-sm disabled:opacity-40 hover:scale-105 transition"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          )}

          {/* ── WITHDRAWN ── */}
          {phase === 'withdrawn' && (
            <motion.div
              key="withdrawn"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-9xl mb-4"
              >
                💵
              </motion.div>
              <div className="font-display text-4xl mb-2">Withdrawn!</div>
              <div className="text-lg opacity-80 mb-6">
                Your investment is back in your cashout balance.
                <br />
                Cash out with Dad when you're ready.
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  navigate('/');
                }}
                className="btn-pop bg-money-bright font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                BACK TO HOME
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
