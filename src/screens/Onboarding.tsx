import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { AVATARS } from '../lib/constants';

type Step = 'welcome' | 'name' | 'avatar' | 'pin' | 'done';

export default function Onboarding() {
  const restoreOrCreateProfile = useStore((s) => s.restoreOrCreateProfile);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    await restoreOrCreateProfile(name.trim(), avatar, pin);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="font-display text-7xl md:text-8xl mb-4 drop-shadow-lg">
                RICH KID <span className="text-electric-yellow">💰</span>POOR DAD
              </div>
              <p className="text-2xl mb-12 opacity-90">Answer questions. Earn real cash.</p>
              <button
                onClick={() => setStep('name')}
                className="btn-pop bg-electric-yellow text-ink font-display text-4xl px-12 py-6 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                LET'S GO
              </button>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-5xl mb-4">What's your name?</div>
              <p className="text-xl mb-8 opacity-80">This is what'll show on the leaderboard</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={12}
                autoFocus
                className="w-full max-w-md text-3xl text-center py-4 px-6 rounded-2xl bg-white text-ink font-bold border-4 border-white shadow-pop focus:outline-none focus:border-electric-yellow"
              />
              <div className="mt-8">
                <button
                  disabled={name.trim().length < 1}
                  onClick={() => setStep('avatar')}
                  className="btn-pop bg-money-bright text-white font-display text-3xl px-10 py-4 rounded-2xl shadow-pop disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition"
                >
                  NEXT →
                </button>
              </div>
            </motion.div>
          )}

          {step === 'avatar' && (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-5xl mb-2">Pick your character</div>
              <p className="text-xl mb-8 opacity-80">You can change it later</p>
              <div className="grid grid-cols-5 gap-4 mb-8">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-6xl p-4 rounded-2xl transition-all ${
                      avatar === a
                        ? 'bg-electric-yellow scale-110 shadow-pop'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('pin')}
                className="btn-pop bg-money-bright text-white font-display text-3xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                NEXT →
              </button>
            </motion.div>
          )}

          {step === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center"
            >
              <div className="font-display text-5xl mb-2">Dad's PIN</div>
              <p className="text-xl mb-2 opacity-80">Dad — set a 4-digit PIN.</p>
              <p className="text-lg mb-8 opacity-70">You'll type this to approve cash outs.</p>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                placeholder="••••"
                autoFocus
                className="w-40 text-5xl text-center py-4 rounded-2xl bg-white text-ink font-bold border-4 border-white shadow-pop focus:outline-none focus:border-electric-yellow tracking-[0.5em]"
              />
              <div className="mt-8">
                <button
                  disabled={pin.length !== 4 || loading}
                  onClick={finish}
                  className="btn-pop bg-electric-yellow text-ink font-display text-4xl px-12 py-6 rounded-2xl shadow-pop disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition"
                >
                  {loading ? '...' : 'START EARNING'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
