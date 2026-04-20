import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import VisualRenderer from '../components/visuals/VisualRenderer';
import { sounds } from '../lib/sounds';
import { getNextQuestion, getEasierQuestion } from '../lib/questionEngine';
import type { Subject, GeneratedQuestion, Tier } from '../types';
import { formatMoney, formatBig } from '../lib/format';
import { RIVALS } from '../data/rivals';
import { TIER_CENTS, TIER_NAMES, UNLOCK_WINDOWS, STREAK_MULTIPLIERS, TIER_CLIMB_BACK_STREAK, CONFIDENCE_RESET_TRIGGER, QUESTIONS_PER_LEVEL } from '../lib/constants';

type Phase = 'asking' | 'correct' | 'wrong' | 'hint';

export default function Play() {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: Subject }>();
  const subj = (subject || 'math') as Subject;

  const progressBySubject = useStore((s) => s.progressBySubject);
  const earnings = useStore((s) => s.earnings);
  const totalQuestionsAnswered = useStore((s) => s.totalQuestionsAnswered ?? 0);
  const answerCorrect = useStore((s) => s.answerCorrect);
  const answerWrong = useStore((s) => s.answerWrong);
  const startSession = useStore((s) => s.startSession);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const tickRivals = useStore((s) => s.tickRivals);
  const profile = useStore((s) => s.profile);
  const rivalEarnings = useStore((s) => s.rivalEarnings);

  useEffect(() => {
    sounds.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>('asking');
  const [confidenceReset, setConfidenceReset] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [hintShown, setHintShown] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [showUnlock, setShowUnlock] = useState<Tier | null>(null);
  const [unlockIsNew, setUnlockIsNew] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; cents: number }[]>([]);
  const [sessionQuestions, setSessionQuestions] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showSessionEnd, setShowSessionEnd] = useState(false);
  const [rivalToast, setRivalToast] = useState<{ emoji: string; name: string; earned: number } | null>(null);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [multiBanner, setMultiBanner] = useState<{ mult: number; streak: number } | null>(null);

  useEffect(() => {
    startSession();
  }, []);

  // Tick rivals every 2 minutes while playing — creates live competition feel
  useEffect(() => {
    const TICK_MS = 2 * 60 * 1000;
    const id = setInterval(() => {
      const notifications = tickRivals(TICK_MS);
      // Show a toast for the rival that earned the most this tick
      const notable = notifications.filter((n) => n.earned >= 1).sort((a, b) => b.earned - a.earned)[0];
      if (notable) {
        setRivalToast({ emoji: notable.emoji, name: notable.name, earned: notable.earned });
        setTimeout(() => setRivalToast(null), 3000);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const loadNext = useCallback((easier = false) => {
    const progress = useStore.getState().progressBySubject[subj];
    const q = easier ? getEasierQuestion(subj, progress) : getNextQuestion(subj, progress);
    setQuestion(q);
    setPhase('asking');
    setSelectedAnswer(null);
    setInputValue('');
    setHintShown(false);
    setConfidenceReset(false);
  }, [subj]);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  const handleAnswer = (userAnswer: string) => {
    if (!question || phase !== 'asking') return;
    setSelectedAnswer(userAnswer);
    const isCorrect =
      userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();

    setSessionQuestions((n) => n + 1);

    if (isCorrect) {
      const result = answerCorrect(subj, question.sourceId);
      setLastEarned(result.earned);
      setSessionCorrect((n) => n + 1);
      setBestStreak((b) => Math.max(b, result.newStreak));
      setPhase('correct');
      setFloaters((f) => [...f, { id: Date.now(), cents: result.earned }]);

      sounds.correct();
      setTimeout(() => sounds.coin(result.earned), 250);

      if ([3, 5, 7, 10].includes(result.newStreak)) {
        setTimeout(() => sounds.streakUp(), 600);
        const mult = STREAK_MULTIPLIERS.find((m) => result.newStreak >= m.threshold)?.multiplier ?? 1;
        setTimeout(() => {
          setMultiBanner({ mult, streak: result.newStreak });
          setTimeout(() => setMultiBanner(null), 2200);
        }, 650);
      }

      if (result.unlockedTier) {
        setTimeout(() => {
          sounds.fanfare();
          setUnlockIsNew(true);
          setShowUnlock(result.unlockedTier!);
        }, 900);
      } else if (result.climbedTier) {
        setTimeout(() => {
          sounds.streakUp();
          setUnlockIsNew(false);
          setShowUnlock(result.climbedTier!);
        }, 600);
      }

      if (result.leveledUp) {
        setTimeout(() => {
          sounds.streakUp();
          setShowLevelUp(result.leveledUp!);
        }, result.unlockedTier ? 1800 : 1200);
      }

      if (result.crossedMilestone) {
        setTimeout(() => {
          sounds.chaChing();
          setShowMilestone(result.crossedMilestone!);
        }, result.unlockedTier ? 2400 : 1600);
      }
    } else {
      const result = answerWrong(subj, question.sourceId);
      setPhase('wrong');
      sounds.wrong();
      if (result.consecutiveWrong >= CONFIDENCE_RESET_TRIGGER) {
        setConfidenceReset(true);
      }
    }
  };

  const handleHome = () => {
    sounds.click();
    if (sessionQuestions > 0) {
      setShowSessionEnd(true);
    } else {
      navigate('/');
    }
  };

  const handlePass = () => {
    if (!question) return;
    answerWrong(subj, question.sourceId);
    loadNext();
  };

  useEffect(() => {
    if (floaters.length === 0) return;
    const timer = setTimeout(() => setFloaters([]), 1000);
    return () => clearTimeout(timer);
  }, [floaters]);

  const leaderboard = useMemo(() => {
    const rivals = RIVALS.map((r) => ({
      id: r.id, name: r.name, emoji: r.emoji,
      cents: rivalEarnings[r.id] ?? 0, isPlayer: false,
    }));
    const player = {
      id: 'player', name: profile?.name || 'You', emoji: profile?.avatar || '⚡',
      cents: earnings.lifetimeCents, isPlayer: true,
    };
    return [...rivals, player].sort((a, b) => b.cents - a.cents);
  }, [rivalEarnings, earnings.lifetimeCents, profile]);

  const playerRank = leaderboard.findIndex((e) => e.isPlayer) + 1;
  const rivalAhead = leaderboard.find((e, i) => !e.isPlayer && i < playerRank - 1);

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-3xl">No questions available yet for this subject.</div>
      </div>
    );
  }

  const progress = progressBySubject[subj];
  const tierPay = TIER_CENTS[progress.currentTier];
  const streakMult = STREAK_MULTIPLIERS.find((m) => earnings.streak >= m.threshold)?.multiplier ?? 1;

  return (
    <div className="min-h-screen p-6 md:p-10 relative overflow-hidden">
      {/* Top HUD */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleHome}
            className="btn-pop bg-white/20 px-4 py-2 rounded-xl font-semibold hover:bg-white/30 transition"
          >
            ← Home
          </button>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs opacity-70 uppercase tracking-wider">Streak</div>
              <motion.div
                key={earnings.streak}
                animate={{ scale: earnings.streak > 0 ? [1, 1.3, 1] : 1 }}
                className="font-display text-3xl"
              >
                🔥 {earnings.streak}
              </motion.div>
              {streakMult > 1 && (
                <div className="text-xs text-electric-yellow font-bold">{streakMult}× earnings!</div>
              )}
            </div>

            <div className="text-center bg-money/80 px-5 py-2 rounded-2xl shadow-pop-sm">
              <div className="text-xs opacity-80 uppercase tracking-wider">This session</div>
              <motion.div
                key={earnings.sessionCents}
                animate={{ scale: [1, 1.2, 1] }}
                className="font-display text-3xl"
              >
                {formatMoney(earnings.sessionCents)}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Level display */}
        {(() => {
          const level = Math.floor(totalQuestionsAnswered / QUESTIONS_PER_LEVEL) + 1;
          const toNext = QUESTIONS_PER_LEVEL - (totalQuestionsAnswered % QUESTIONS_PER_LEVEL);
          return (
            <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2">
              <div className="font-display text-xl text-electric-yellow">
                ⬆️ LEVEL {level}
              </div>
              <div className="text-xs opacity-50">
                {toNext} correct to Level {level + 1}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tier badge + progress bar */}
      {(() => {
        const cur = progress.currentTier;
        const best = progress.unlockedTier;
        const isDropped = cur < best;
        const isMaxTier = cur >= 6;

        // Progress bar logic
        // — If dropped: show climb-back progress (last 5 answers)
        // — If at max: full bar
        // — Otherwise: progress toward next unlock
        let pct = 0;
        let label: React.ReactNode;

        if (isDropped) {
          const recent = progress.rollingAccuracy.slice(-TIER_CLIMB_BACK_STREAK);
          const streak = recent.filter(Boolean).length;
          pct = Math.round((streak / TIER_CLIMB_BACK_STREAK) * 100);
          label = (
            <span className="text-red-300 font-bold text-xs">
              {streak}/{TIER_CLIMB_BACK_STREAK} to climb back → {TIER_NAMES[(cur + 1) as Tier]}
            </span>
          );
        } else if (isMaxTier) {
          pct = 100;
          label = <span className="text-electric-yellow font-bold text-xs">MAX TIER 🔥</span>;
        } else {
          const window = UNLOCK_WINDOWS[best];
          const filled = Math.min(progress.rollingAccuracy.length, window);
          const correct = progress.rollingAccuracy.slice(-window).filter(Boolean).length;
          pct = Math.round((filled / window) * 100);
          label = (
            <span className="opacity-60 text-xs">
              {correct}/{window} → {TIER_NAMES[(best + 1) as Tier]}
            </span>
          );
        }

        return (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="flex items-center justify-between text-sm mb-1 px-1">
              <span className={`font-display text-lg ${isDropped ? 'text-red-300' : 'opacity-90'}`}>
                {TIER_NAMES[cur]}
                <span className="ml-2 opacity-60 font-sans font-normal text-xs">{tierPay}¢/q</span>
                {isDropped && (
                  <span className="ml-2 text-xs opacity-60 font-sans font-normal">
                    (best: {TIER_NAMES[best]})
                  </span>
                )}
              </span>
              {label}
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isDropped ? 'bg-red-400' : 'bg-electric-yellow'}`}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })()}

      {/* Leaderboard strip */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2 text-sm">
          <div className="font-display text-base">
            {playerRank === 1 ? '👑 #1' : `#${playerRank}`}
            <span className="ml-2 opacity-60 font-sans font-normal text-xs">your rank</span>
          </div>
          {rivalAhead ? (
            <div className="flex items-center gap-2">
              <span className="opacity-50 text-xs">ahead:</span>
              <span>{rivalAhead.emoji}</span>
              <span className="font-semibold">{rivalAhead.name}</span>
              <span className="text-electric-yellow font-display">+{formatBig(rivalAhead.cents - earnings.lifetimeCents)}</span>
            </div>
          ) : (
            <div className="text-electric-yellow font-display text-sm">👑 You're in the lead!</div>
          )}
        </div>
      </div>

      {/* Question Card */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.sourceId + phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`card p-8 md:p-12 ${
              phase === 'correct' ? 'bg-money/30 border-money' :
              phase === 'wrong' ? 'bg-red-500/20 border-red-400 animate-shake' : ''
            }`}
          >
            {question.passage && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-6 text-lg md:text-xl leading-relaxed font-body">
                <div className="text-xs uppercase tracking-wider opacity-60 font-bold mb-2">📖 Read this</div>
                {question.passage}
              </div>
            )}

            <div className="font-display text-3xl md:text-5xl text-center leading-tight mb-6">
              {question.question}
            </div>

            {question.visual && question.visual.type !== 'none' && (
              <div className="flex justify-center mb-8">
                <VisualRenderer visual={question.visual} />
              </div>
            )}

            {question.type === 'multiple_choice' && question.options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((opt) => {
                  const isSelected = selectedAnswer === opt;
                  const isCorrectOne = opt === question.answer;
                  let style = 'bg-white/15 hover:bg-white/25';
                  if (phase !== 'asking') {
                    if (isCorrectOne) style = 'bg-money text-white shadow-glow-money';
                    else if (isSelected) style = 'bg-red-500 text-white';
                    else style = 'bg-white/10 opacity-60';
                  }
                  return (
                    <button
                      key={opt}
                      disabled={phase !== 'asking'}
                      onClick={() => handleAnswer(opt)}
                      className={`btn-pop p-5 rounded-2xl font-display text-2xl md:text-3xl shadow-pop-sm transition ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === 'number_input' && (
              <div className="flex flex-col items-center gap-4">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={phase !== 'asking'}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) handleAnswer(inputValue);
                  }}
                  className="text-5xl text-center py-3 px-6 w-52 rounded-2xl bg-white text-ink font-bold border-4 border-white shadow-pop focus:outline-none focus:border-electric-yellow"
                />
                <button
                  disabled={!inputValue.trim() || phase !== 'asking'}
                  onClick={() => handleAnswer(inputValue)}
                  className="btn-pop bg-money-bright font-display text-2xl px-8 py-3 rounded-2xl shadow-pop-sm disabled:opacity-40"
                >
                  ANSWER
                </button>
              </div>
            )}

            {/* Feedback */}
            {phase === 'correct' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-6 text-center"
              >
                <div className="font-display text-5xl text-money-glow drop-shadow-lg mb-2">
                  +{formatMoney(lastEarned)} 💰
                </div>
                <div className="text-lg opacity-90">{question.explanation}</div>
                <button
                  onClick={() => loadNext()}
                  autoFocus
                  className="mt-4 btn-pop bg-electric-yellow text-ink font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  NEXT →
                </button>
              </motion.div>
            )}

            {phase === 'wrong' && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-6 text-center"
              >
                <div className="font-display text-3xl mb-2">Not quite!</div>
                <div className="text-lg opacity-90 mb-2">The answer was <strong>{question.answer}</strong></div>
                <div className="text-base opacity-80">{question.explanation}</div>
                <button
                  onClick={() => loadNext(confidenceReset)}
                  autoFocus
                  className="mt-4 btn-pop bg-electric-yellow text-ink font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  KEEP GOING →
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Help bar */}
        {phase === 'asking' && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {!hintShown ? (
              <button
                onClick={() => setHintShown(true)}
                className="btn-pop bg-white/15 px-5 py-2 rounded-xl font-semibold hover:bg-white/25 transition"
              >
                💡 Hint
              </button>
            ) : (
              <div className="bg-electric-yellow/90 text-ink px-4 py-2 rounded-xl font-semibold max-w-lg text-center">
                💡 {question.hint}
              </div>
            )}
            <button
              onClick={handlePass}
              className="btn-pop bg-white/15 px-5 py-2 rounded-xl font-semibold hover:bg-white/25 transition"
            >
              Pass →
            </button>
          </div>
        )}
      </div>

      {/* Streak multiplier banner */}
      <AnimatePresence>
        {multiBanner !== null && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 12, stiffness: 260 }}
            className="fixed inset-x-0 top-24 flex justify-center z-50 pointer-events-none"
          >
            <div className={`flex items-center gap-4 px-8 py-4 rounded-3xl shadow-pop font-display ${
              multiBanner.mult >= 5 ? 'bg-gradient-to-r from-electric-orange to-red-500 text-white' :
              multiBanner.mult >= 3 ? 'bg-gradient-to-r from-electric-yellow to-electric-orange text-ink' :
              'bg-gradient-to-r from-electric-yellow to-yellow-300 text-ink'
            }`}>
              <motion.span
                animate={{ rotate: [-10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-4xl"
              >
                🔥
              </motion.span>
              <div className="text-center">
                <div className="text-xl md:text-2xl opacity-80 leading-none mb-1">
                  {multiBanner.streak} in a row!
                </div>
                <div className="text-4xl md:text-5xl tracking-tight leading-none">
                  {multiBanner.mult}× MULTIPLIER!
                </div>
              </div>
              <motion.span
                animate={{ rotate: [10, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-4xl"
              >
                🔥
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rival activity toast */}
      <AnimatePresence>
        {rivalToast && (
          <motion.div
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 right-4 z-50 bg-white/15 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3 shadow-pop"
          >
            <span className="text-2xl">{rivalToast.emoji}</span>
            <div>
              <div className="text-xs opacity-70 font-bold uppercase tracking-wide">{rivalToast.name} just earned</div>
              <div className="font-display text-xl text-electric-yellow">+{rivalToast.earned}¢</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating cents */}
      <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{ y: -150, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="font-display text-6xl text-electric-yellow drop-shadow-lg absolute"
            >
              +{formatMoney(f.cents)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tier unlock modal */}
      <AnimatePresence>
        {showUnlock !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowUnlock(null)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5 }}
              className={`p-10 rounded-3xl text-center shadow-pop max-w-lg mx-4 ${
                !unlockIsNew
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  : showUnlock === 6
                  ? 'bg-gradient-to-br from-purple-500 to-electric-orange text-white'
                  : 'bg-gradient-to-br from-electric-yellow to-electric-orange text-ink'
              }`}
            >
              {unlockIsNew ? (
                <>
                  <div className="text-7xl mb-4">{showUnlock === 6 ? '👑' : '🏆'}</div>
                  <div className="font-display text-5xl mb-2">
                    {showUnlock === 6 ? 'YOU REACHED' : 'TIER UNLOCKED!'}
                  </div>
                  <div className={`font-display mb-4 ${showUnlock === 6 ? 'text-5xl text-electric-yellow' : 'text-3xl'}`}>
                    {TIER_NAMES[showUnlock!]}
                  </div>
                  <div className="text-xl mb-6 font-semibold">
                    You now earn {TIER_CENTS[showUnlock!]}¢ per question!
                  </div>
                  <button
                    onClick={() => setShowUnlock(null)}
                    className="btn-pop bg-ink text-white font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                  >
                    {showUnlock === 6 ? "LET'S GOOO! 🔥" : "LET'S GO!"}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-7xl mb-4">💪</div>
                  <div className="font-display text-5xl mb-2">BACK IN THE ZONE!</div>
                  <div className="font-display text-3xl mb-4 text-electric-yellow">
                    {TIER_NAMES[showUnlock!]}
                  </div>
                  <div className="text-xl mb-6 font-semibold">
                    Back to earning {TIER_CENTS[showUnlock!]}¢ per question!
                  </div>
                  <button
                    onClick={() => setShowUnlock(null)}
                    className="btn-pop bg-ink text-white font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                  >
                    KEEP IT UP! 🔥
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up modal */}
      <AnimatePresence>
        {showLevelUp !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowLevelUp(null)}
          >
            <motion.div
              initial={{ scale: 0.4, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="p-10 rounded-3xl text-center shadow-pop max-w-md mx-4 bg-gradient-to-br from-electric-blue to-purple-600 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8 }}
                className="text-8xl mb-3"
              >
                ⬆️
              </motion.div>
              <div className="font-display text-2xl opacity-80 mb-1">YOU HIT</div>
              <div className="font-display text-7xl text-electric-yellow drop-shadow-lg mb-1">
                LEVEL {showLevelUp}
              </div>
              <div className="text-lg opacity-80 mb-6">
                {showLevelUp % 10 === 0
                  ? `🔥 Level ${showLevelUp}?! You're an absolute beast!`
                  : showLevelUp % 5 === 0
                  ? `🏆 Milestone! Level ${showLevelUp} — keep climbing!`
                  : `${QUESTIONS_PER_LEVEL} more questions crushed. Keep it up!`}
              </div>
              <div className="bg-white/15 rounded-2xl px-6 py-3 mb-6 text-sm opacity-90">
                Next level in {QUESTIONS_PER_LEVEL} questions
              </div>
              <button
                onClick={() => setShowLevelUp(null)}
                className="btn-pop bg-electric-yellow text-ink font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                LET'S GO! 🚀
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone modal */}
      <AnimatePresence>
        {showMilestone !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowMilestone(null)}
          >
            <motion.div
              initial={{ scale: 0.4, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', damping: 14 }}
              className="p-10 rounded-3xl text-center shadow-pop max-w-md mx-4 bg-gradient-to-br from-money to-money-bright text-ink"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.9 }}
                className="text-8xl mb-3"
              >
                💰
              </motion.div>
              <div className="font-display text-2xl opacity-70 mb-1">YOU HIT</div>
              <div className="font-display text-7xl drop-shadow-lg mb-2">
                ${(showMilestone / 100).toFixed(0)}
              </div>
              <div className="text-lg font-semibold mb-6 opacity-80">
                {showMilestone === 500
                  ? `First $5 earned! You're on the board! 🚀`
                  : showMilestone >= 2000
                  ? `${formatMoney(showMilestone)} lifetime — absolute legend! 👑`
                  : `${formatMoney(showMilestone)} lifetime — keep stacking! 🔥`}
              </div>
              <button
                onClick={() => setShowMilestone(null)}
                className="btn-pop bg-ink text-electric-yellow font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
              >
                KEEP GOING 💸
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session End modal */}
      <AnimatePresence>
        {showSessionEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.6, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', damping: 18 }}
              className="bg-gradient-to-br from-money to-money-bright text-white p-8 md:p-10 rounded-3xl text-center shadow-glow-money max-w-lg w-full"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ duration: 0.7 }}
                className="text-7xl mb-2"
              >
                💰
              </motion.div>
              <div className="font-display text-3xl md:text-4xl opacity-90 mb-1">
                SESSION COMPLETE
              </div>
              <div className="text-sm uppercase tracking-wider opacity-80 mb-5 capitalize">
                {subj}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="font-display text-7xl md:text-8xl text-electric-yellow drop-shadow-lg mb-6"
              >
                +{formatMoney(earnings.sessionCents)}
              </motion.div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/15 rounded-2xl p-3">
                  <div className="text-xs uppercase opacity-80">Questions</div>
                  <div className="font-display text-3xl">{sessionQuestions}</div>
                </div>
                <div className="bg-white/15 rounded-2xl p-3">
                  <div className="text-xs uppercase opacity-80">Accuracy</div>
                  <div className="font-display text-3xl">
                    {sessionQuestions > 0
                      ? Math.round((sessionCorrect / sessionQuestions) * 100)
                      : 0}
                    %
                  </div>
                </div>
                <div className="bg-white/15 rounded-2xl p-3">
                  <div className="text-xs uppercase opacity-80">Best Streak</div>
                  <div className="font-display text-3xl">🔥 {bestStreak}</div>
                </div>
              </div>

              <div className="text-lg opacity-90 mb-5">
                {bestStreak >= 10
                  ? "🔥🔥 ON FIRE! You're unstoppable!"
                  : bestStreak >= 5
                  ? '🔥 Streak master! Keep it rolling.'
                  : sessionCorrect === sessionQuestions && sessionQuestions >= 3
                  ? '💯 Perfect round! Clean sweep.'
                  : "Nice work — that's real money earned!"}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    sounds.click();
                    setShowSessionEnd(false);
                    setSessionQuestions(0);
                    setSessionCorrect(0);
                    setBestStreak(0);
                    startSession();
                    loadNext();
                  }}
                  className="btn-pop bg-white/20 hover:bg-white/30 font-display text-xl px-6 py-3 rounded-2xl transition"
                >
                  KEEP PLAYING
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    navigate('/');
                  }}
                  className="btn-pop bg-electric-yellow text-ink font-display text-2xl px-8 py-3 rounded-2xl shadow-pop hover:scale-105 transition"
                >
                  BACK TO HOME →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
