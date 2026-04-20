import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { RIVALS } from '../data/rivals';
import { formatBig, formatMoney, formatTimeAgo } from '../lib/format';
import { sounds } from '../lib/sounds';
import { CASHOUT_MIN_CENTS, TIER_CENTS, TIER_NAMES, STREAK_MULTIPLIERS, QUESTIONS_PER_LEVEL } from '../lib/constants';
import type { Subject } from '../types';

const SUBJECT_CARDS: { id: Subject; name: string; emoji: string; color: string; available: boolean }[] = [
  { id: 'math', name: 'MATH', emoji: '🔢', color: 'from-electric-blue to-blue-700', available: true },
  { id: 'logic', name: 'LOGIC', emoji: '🧩', color: 'from-purple-500 to-purple-700', available: true },
  { id: 'reading', name: 'READING', emoji: '📚', color: 'from-emerald-500 to-emerald-700', available: true },
  { id: 'science', name: 'SCIENCE', emoji: '🔬', color: 'from-pink-500 to-pink-700', available: true },
  { id: 'engineering', name: 'ENGINEERING', emoji: '⚙️', color: 'from-amber-500 to-amber-700', available: true },
];

export default function Home() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const earnings = useStore((s) => s.earnings);
  const progressBySubject = useStore((s) => s.progressBySubject);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const toggleSound = useStore((s) => s.toggleSound);
  const investedCents = useStore((s) => s.investedCents);
  const investmentPrincipal = useStore((s) => s.investmentPrincipal);
  const investmentRatePerHour = useStore((s) => s.investmentRatePerHour);
  const totalQuestionsAnswered = useStore((s) => s.totalQuestionsAnswered);
  const rivalEarnings = useStore((s) => s.rivalEarnings);
  const rivalLastActive = useStore((s) => s.rivalLastActive);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);


  const leaderboard = useMemo(() => {
    const rivals = RIVALS.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      cents: rivalEarnings[r.id] ?? 0,
      lastActive: rivalLastActive[r.id] ?? null,
      isPlayer: false,
    }));
    const player = {
      id: 'player',
      name: profile?.name || 'You',
      emoji: profile?.avatar || '⚡',
      cents: earnings.lifetimeCents,
      lastActive: null as number | null,
      isPlayer: true,
    };
    return [...rivals, player].sort((a, b) => b.cents - a.cents);
  }, [profile, earnings.lifetimeCents, rivalEarnings, rivalLastActive]);

  const playerRank = leaderboard.findIndex((e) => e.isPlayer) + 1;
  const canCashout = earnings.cashoutBalanceCents >= CASHOUT_MIN_CENTS;
  const [guideOpen, setGuideOpen] = useState(false);

  const nextRival = leaderboard.find((e, i) => !e.isPlayer && i < playerRank - 1);
  const gap = nextRival ? nextRival.cents - earnings.lifetimeCents : 0;

  const todaysMission = useMemo(() => {
    if (earnings.lifetimeCents === 0) {
      return `Everyone starts at $0. Make your first move!`;
    }
    if (playerRank === 1) {
      return `👑 You're in 1st place! Defend it.`;
    }
    if (nextRival && gap > 0 && gap < 200) {
      return `${nextRival.emoji} ${nextRival.name} is only ${formatMoney(gap)} ahead. Catch up!`;
    }
    return `Chase down ${nextRival?.name || 'The Kraken'}!`;
  }, [nextRival, gap, playerRank, earnings.lifetimeCents]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-5xl">{profile?.avatar}</div>
            <div>
              <div className="font-display text-2xl">{profile?.name}</div>
              <div className="text-sm opacity-70">Rank #{playerRank} · All Time</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                toggleSound();
                if (!soundEnabled) {
                  // re-enabling — play a test sound
                  setTimeout(() => sounds.click(), 50);
                }
              }}
              className="btn-pop bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl text-xl transition"
              title={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <div className="font-display text-3xl md:text-4xl">
              RICH KID <span className="text-electric-yellow">💰</span>POOR DAD
            </div>
          </div>
        </div>

        {/* LEVEL DISPLAY */}
        {(() => {
          const level = Math.floor(totalQuestionsAnswered / QUESTIONS_PER_LEVEL) + 1;
          const toNext = QUESTIONS_PER_LEVEL - (totalQuestionsAnswered % QUESTIONS_PER_LEVEL);
          return (
            <div className="mb-5 bg-white/10 rounded-2xl px-5 py-3 flex items-center justify-between">
              <div className="font-display text-3xl text-electric-yellow">
                ⬆️ LEVEL {level}
              </div>
              <div className="text-sm opacity-60">
                {toNext} correct to Level {level + 1}
              </div>
            </div>
          );
        })()}

        {/* BIG EARNINGS DISPLAY */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card p-8 md:p-10 mb-6 text-center bg-gradient-to-br from-money to-money-bright shadow-glow-money"
        >
          <div className="text-lg md:text-xl opacity-90 font-semibold mb-2">
            READY TO CASH OUT
          </div>
          <motion.div
            key={earnings.cashoutBalanceCents}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="font-display text-7xl md:text-9xl drop-shadow-lg tracking-tight"
          >
            {formatBig(earnings.cashoutBalanceCents)}
          </motion.div>
          <div className="text-base md:text-lg opacity-80 mt-2">
            Lifetime earned: {formatBig(earnings.lifetimeCents)}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              disabled={!canCashout}
              onClick={() => {
                sounds.click();
                navigate('/cashout');
              }}
              className={`btn-pop font-display text-3xl md:text-4xl px-10 py-4 rounded-2xl shadow-pop transition ${
                canCashout
                  ? 'bg-electric-yellow text-ink hover:scale-105 animate-pulse'
                  : 'bg-white/20 text-white/60 cursor-not-allowed'
              }`}
            >
              {canCashout
                ? '💵 CASH OUT'
                : `Need ${formatMoney(CASHOUT_MIN_CENTS - earnings.cashoutBalanceCents)} more`}
            </button>
            {earnings.cashoutBalanceCents > 0 && (
              <button
                onClick={() => {
                  sounds.click();
                  navigate('/invest');
                }}
                className="btn-pop bg-emerald-500 hover:bg-emerald-400 font-display text-3xl md:text-4xl px-10 py-4 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                📈 INVEST
              </button>
            )}
          </div>
        </motion.div>

        {/* Investment card — shown only when there's an active investment */}
        {investedCents > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="card p-5 mb-6 bg-gradient-to-r from-emerald-700/80 to-emerald-600/80 cursor-pointer hover:scale-[1.01] transition"
            onClick={() => {
              sounds.click();
              navigate('/invest');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-1">
                  📈 Dad's Bank · {investmentRatePerHour * 100}%/hr of play
                </div>
                <div className="font-display text-3xl md:text-4xl">{formatBig(investedCents)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-70">Interest earned</div>
                <div className="font-display text-2xl text-electric-yellow">
                  +{formatMoney(investedCents - investmentPrincipal)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TODAY'S MISSION */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card p-5 mb-6 bg-gradient-to-r from-electric-orange/80 to-electric-yellow/80"
        >
          <div className="text-xs uppercase tracking-wider opacity-80 font-bold mb-1">Today's Mission</div>
          <div className="font-display text-2xl md:text-3xl">{todaysMission}</div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Subject picker */}
          <div>
            <div className="font-display text-2xl mb-3 opacity-90">Pick your challenge</div>
            <div className="grid grid-cols-2 gap-3">
              {SUBJECT_CARDS.map((s) => {
                const p = progressBySubject[s.id];
                const tierPay = p ? TIER_CENTS[p.unlockedTier] : 5;
                return (
                  <button
                    key={s.id}
                    disabled={!s.available}
                    onClick={() => {
                      sounds.click();
                      navigate(`/play/${s.id}`);
                    }}
                    className={`btn-pop p-5 rounded-3xl text-left bg-gradient-to-br ${s.color} shadow-pop hover:scale-105 transition disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div className="text-5xl mb-2">{s.emoji}</div>
                    <div className="font-display text-2xl">{s.name}</div>
                    {s.available ? (
                      <div className="text-sm opacity-90 mt-1">
                        Earn {tierPay}¢ per question
                      </div>
                    ) : (
                      <div className="text-sm opacity-80 mt-1">Coming soon</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="font-display text-2xl mb-3 opacity-90">Leaderboard</div>
            <div className="card p-4 space-y-2">
              {leaderboard.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    e.isPlayer
                      ? 'bg-electric-yellow text-ink font-bold shadow-pop-sm'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="font-display text-2xl w-8 text-center opacity-80">
                    {i === 0 ? '👑' : `#${i + 1}`}
                  </div>
                  <div className="text-3xl">{e.emoji}</div>
                  <div className="flex-1">
                    <div className="font-display text-lg">{e.name}</div>
                    {!e.isPlayer && e.lastActive && (
                      <div className={`text-xs ${e.isPlayer ? 'opacity-60' : 'opacity-50'}`}>
                        active {formatTimeAgo(e.lastActive)}
                      </div>
                    )}
                  </div>
                  <div className="font-display text-xl">{formatBig(e.cents)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Earnings Guide */}
        <div className="mt-6">
          <button
            onClick={() => { sounds.click(); setGuideOpen((o) => !o); }}
            className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 transition"
          >
            <span className="font-display text-lg opacity-80">📖 Earnings Guide</span>
            <span className="text-xl opacity-60">{guideOpen ? '▲' : '▼'}</span>
          </button>
          <AnimatePresence>
            {guideOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {/* Tier table */}
                  <div className="card p-4">
                    <div className="font-display text-base mb-3 opacity-70 uppercase tracking-wider">Tier Payouts</div>
                    <div className="space-y-2">
                      {([1, 2, 3, 4, 5, 6] as const).map((tier) => (
                        <div key={tier} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm opacity-50">T{tier}</span>
                            <span className="text-sm">{TIER_NAMES[tier]}</span>
                          </div>
                          <span className="font-display text-sm text-electric-yellow">{TIER_CENTS[tier]}¢/q</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Streak multiplier table */}
                  <div className="card p-4">
                    <div className="font-display text-base mb-3 opacity-70 uppercase tracking-wider">Hot Streaks</div>
                    <div className="space-y-2">
                      {[...STREAK_MULTIPLIERS].reverse().map((m) => (
                        <div key={m.threshold} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-base">🔥</span>
                            <span className="text-sm">
                              {m.threshold === 0 ? 'Any' : `${m.threshold}+ in a row`}
                            </span>
                          </div>
                          <span className={`font-display text-sm ${m.multiplier >= 3 ? 'text-electric-yellow' : m.multiplier > 1 ? 'text-emerald-300' : 'opacity-50'}`}>
                            {m.multiplier}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs opacity-40 text-center mt-2">
                  e.g. T6 + 10-streak = {TIER_CENTS[6]}¢ × 5 = {TIER_CENTS[6] * 5}¢ per question
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
