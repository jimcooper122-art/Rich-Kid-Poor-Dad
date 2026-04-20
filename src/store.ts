import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deriveUserId, loadCloudState, saveCloudState, deleteCloudState } from './lib/supabase';
import type {
  PlayerProfile,
  Earnings,
  Subject,
  SubjectProgress,
  Transaction,
  Tier,
} from './types';
import {
  TIER_CENTS,
  STREAK_MULTIPLIERS,
  UNLOCK_ACCURACY_THRESHOLD,
  UNLOCK_WINDOWS,
  DROP_MISS_THRESHOLD,
  TIER_CLIMB_BACK_STREAK,
  SUBJECTS,
  DEFAULT_INVESTMENT_RATE_PER_HOUR,
  MAX_INTEREST_SESSION_MS,
  QUESTIONS_PER_LEVEL,
} from './lib/constants';
import { RIVALS } from './data/rivals';

interface StoreState {
  profile: PlayerProfile | null;
  earnings: Earnings;
  progressBySubject: Record<Subject, SubjectProgress>;
  transactions: Transaction[];
  soundEnabled: boolean;
  lastMilestoneCents: number; // highest $5-increment milestone celebrated so far

  // Global level system — infinite, accumulates forever
  totalQuestionsAnswered: number;

  // Investment (Dad's Bank — guaranteed savings model)
  investedCents: number;         // current value including interest
  investmentPrincipal: number;   // original amount deposited (to show growth)
  lastInterestAt: number;        // timestamp of last interest application
  investmentRatePerHour: number; // tunable — default 0.5%/hr of active app use

  createProfile: (name: string, avatar: string, pin: string) => void;
  restoreOrCreateProfile: (name: string, avatar: string, pin: string) => Promise<void>;
  resetProfile: () => void;
  toggleSound: () => void;
  answerCorrect: (subject: Subject, questionId: string) => {
    earned: number;
    newStreak: number;
    unlockedTier?: Tier;
    climbedTier?: Tier;
    leveledUp?: number;
    crossedMilestone?: number; // cents value of milestone crossed, e.g. 500 = $5
  };
  answerWrong: (subject: Subject, questionId: string) => {
    shouldDropTier: boolean;
    consecutiveWrong: number;
  };
  setCurrentTier: (subject: Subject, tier: Tier) => void;
  startSession: () => void;
  requestCashout: (requestedCents: number, paidCents: number, note?: string) => void;
  verifyPin: (pin: string) => boolean;

  invest: (cents: number) => void;
  withdrawInvestment: () => void;
  applyInterest: () => void;

  // Rival simulation
  rivalEarnings: Record<string, number>;   // stored cents per rival this season
  rivalLastActive: Record<string, number>; // last activity timestamp per rival
  rivalLastTick: number;                   // when tickRivals was last called
  tickRivals: (elapsedMs: number) => { id: string; name: string; emoji: string; earned: number }[];

  // Cloud sync
  cloudUserId: string | null;
  cloudSyncedAt: number; // timestamp of last successful cloud save
  initCloud: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

function emptyProgress(): SubjectProgress {
  return {
    currentTier: 1,
    unlockedTier: 1,
    rollingAccuracy: [],
    questionsAnswered: 0,
    questionsCorrect: 0,
    consecutiveWrong: 0,
    lastSeenQuestions: {},
  };
}

function defaultProgressMap(): Record<Subject, SubjectProgress> {
  const map = {} as Record<Subject, SubjectProgress>;
  for (const s of SUBJECTS) map[s] = emptyProgress();
  return map;
}

function computeStreakMultiplier(streak: number): number {
  for (const tier of STREAK_MULTIPLIERS) {
    if (streak >= tier.threshold) return tier.multiplier;
  }
  return 1;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      profile: null,
      earnings: {
        lifetimeCents: 0,
        cashoutBalanceCents: 0,
        sessionCents: 0,
        streak: 0,
      },
      progressBySubject: defaultProgressMap(),
      transactions: [],
      soundEnabled: true,
      lastMilestoneCents: 0,
      totalQuestionsAnswered: 0,
      investedCents: 0,
      investmentPrincipal: 0,
      lastInterestAt: 0,
      investmentRatePerHour: DEFAULT_INVESTMENT_RATE_PER_HOUR,

      rivalEarnings: {},
      rivalLastActive: {},
      rivalLastTick: 0,

      cloudUserId: null,
      cloudSyncedAt: 0,

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      createProfile: (name, avatar, pin) => {
        set({
          profile: {
            id: crypto.randomUUID(),
            name,
            avatar,
            dadPin: pin,
            createdAt: Date.now(),
          },
          earnings: {
            lifetimeCents: 0,
            cashoutBalanceCents: 0,
            sessionCents: 0,
            streak: 0,
          },
          progressBySubject: defaultProgressMap(),
          transactions: [],
          lastMilestoneCents: 0,
          totalQuestionsAnswered: 0,
          investedCents: 0,
          investmentPrincipal: 0,
          lastInterestAt: 0,
          rivalEarnings: {},
          rivalLastActive: {},
          rivalLastTick: 0,
        });
      },

      resetProfile: () => {
        const { cloudUserId } = get();
        if (cloudUserId) deleteCloudState(cloudUserId).catch(() => {});
        set({
          profile: null,
          earnings: {
            lifetimeCents: 0,
            cashoutBalanceCents: 0,
            sessionCents: 0,
            streak: 0,
          },
          progressBySubject: defaultProgressMap(),
          transactions: [],
          lastMilestoneCents: 0,
          totalQuestionsAnswered: 0,
          investedCents: 0,
          investmentPrincipal: 0,
          lastInterestAt: 0,
          rivalEarnings: {},
          rivalLastActive: {},
          rivalLastTick: 0,
          cloudUserId: null,
          cloudSyncedAt: 0,
        });
      },

      startSession: () => {
        const e = get().earnings;
        set({ earnings: { ...e, sessionCents: 0, streak: 0 } });
      },

      answerCorrect: (subject, questionId) => {
        const state = get();
        const p = state.progressBySubject[subject];
        const newStreak = state.earnings.streak + 1;

        // Earnings follow currentTier — you have to maintain your tier to keep the rate
        const baseCents = TIER_CENTS[p.currentTier];
        const mult = computeStreakMultiplier(newStreak);
        const earned = Math.round(baseCents * mult);

        const tierWindow = UNLOCK_WINDOWS[p.unlockedTier];
        const newRolling = [...p.rollingAccuracy, true].slice(-tierWindow);
        const correctCount = newRolling.filter(Boolean).length;
        let unlockedTier = p.unlockedTier;
        let currentTier = p.currentTier;

        // Unlock a brand-new tier (never reached before)
        const canUnlock =
          p.unlockedTier < 6 &&
          newRolling.length >= tierWindow &&
          correctCount / newRolling.length >= UNLOCK_ACCURACY_THRESHOLD;

        // Climb back after a drop: 5 correct in a row at a lower tier
        const canClimbBack =
          !canUnlock &&
          currentTier < unlockedTier &&
          newRolling.slice(-TIER_CLIMB_BACK_STREAK).length === TIER_CLIMB_BACK_STREAK &&
          newRolling.slice(-TIER_CLIMB_BACK_STREAK).every(Boolean);

        let climbedTier: Tier | undefined;

        if (canUnlock) {
          unlockedTier = (p.unlockedTier + 1) as Tier;
          currentTier = unlockedTier;
        } else if (canClimbBack) {
          currentTier = (currentTier + 1) as Tier;
          climbedTier = currentTier;
        }

        const newProgress: SubjectProgress = {
          ...p,
          currentTier,
          unlockedTier,
          rollingAccuracy: canUnlock ? [] : newRolling,
          questionsAnswered: p.questionsAnswered + 1,
          questionsCorrect: p.questionsCorrect + 1,
          consecutiveWrong: 0,
          lastSeenQuestions: { ...p.lastSeenQuestions, [questionId]: Date.now() },
        };

        const prevTotal = state.totalQuestionsAnswered ?? 0;
        const newTotal = prevTotal + 1;
        const prevLevel = Math.floor(prevTotal / QUESTIONS_PER_LEVEL) + 1;
        const newLevel = Math.floor(newTotal / QUESTIONS_PER_LEVEL) + 1;
        const leveledUp = newLevel > prevLevel ? newLevel : undefined;

        // Milestone detection — every $5 (500¢)
        const MILESTONE_STEP = 500;
        const newLifetime = state.earnings.lifetimeCents + earned;
        const prevMilestone = state.lastMilestoneCents;
        const newMilestone = Math.floor(newLifetime / MILESTONE_STEP) * MILESTONE_STEP;
        const crossedMilestone = newMilestone > prevMilestone && newMilestone > 0 ? newMilestone : undefined;

        set({
          progressBySubject: { ...state.progressBySubject, [subject]: newProgress },
          totalQuestionsAnswered: newTotal,
          lastMilestoneCents: crossedMilestone ?? prevMilestone,
          earnings: {
            ...state.earnings,
            streak: newStreak,
            lifetimeCents: newLifetime,
            cashoutBalanceCents: state.earnings.cashoutBalanceCents + earned,
            sessionCents: state.earnings.sessionCents + earned,
          },
        });

        return {
          earned,
          newStreak,
          unlockedTier: canUnlock ? unlockedTier : undefined,
          climbedTier,
          leveledUp,
          crossedMilestone,
        };
      },

      answerWrong: (subject, questionId) => {
        const state = get();
        const p = state.progressBySubject[subject];
        const tierWindow = UNLOCK_WINDOWS[p.unlockedTier];
        const newRolling = [...p.rollingAccuracy, false].slice(-tierWindow);
        const missCount = newRolling.filter((r) => !r).length;
        const shouldDropTier =
          newRolling.length >= tierWindow &&
          missCount >= DROP_MISS_THRESHOLD &&
          p.currentTier > 1;

        const consecutiveWrong = p.consecutiveWrong + 1;

        const newProgress: SubjectProgress = {
          ...p,
          rollingAccuracy: newRolling,
          questionsAnswered: p.questionsAnswered + 1,
          consecutiveWrong,
          lastSeenQuestions: { ...p.lastSeenQuestions, [questionId]: Date.now() },
          currentTier: shouldDropTier ? ((p.currentTier - 1) as Tier) : p.currentTier,
        };

        set({
          progressBySubject: { ...state.progressBySubject, [subject]: newProgress },
          earnings: { ...state.earnings, streak: 0 },
        });

        return { shouldDropTier, consecutiveWrong };
      },

      setCurrentTier: (subject, tier) => {
        const state = get();
        const p = state.progressBySubject[subject];
        if (tier > p.unlockedTier) return;
        set({
          progressBySubject: {
            ...state.progressBySubject,
            [subject]: { ...p, currentTier: tier },
          },
        });
      },

      requestCashout: (requestedCents, paidCents, note) => {
        const state = get();
        const tx: Transaction = {
          id: crypto.randomUUID(),
          amountCents: paidCents,
          requestedCents,
          date: Date.now(),
          note,
        };
        set({
          transactions: [tx, ...state.transactions],
          earnings: {
            ...state.earnings,
            cashoutBalanceCents: state.earnings.cashoutBalanceCents - paidCents,
          },
        });
      },

      verifyPin: (pin) => {
        return get().profile?.dadPin === pin;
      },

      invest: (cents) => {
        const state = get();
        if (cents <= 0 || cents > state.earnings.cashoutBalanceCents) return;
        // Flush any pending interest (capped) before adding new funds
        const now = Date.now();
        let currentInvested = state.investedCents;
        if (currentInvested > 0 && state.lastInterestAt > 0) {
          const elapsed = Math.min(now - state.lastInterestAt, MAX_INTEREST_SESSION_MS);
          const hours = elapsed / (1000 * 60 * 60);
          currentInvested += Math.floor(currentInvested * state.investmentRatePerHour * hours);
        }
        set({
          investedCents: currentInvested + cents,
          investmentPrincipal: state.investmentPrincipal + cents,
          lastInterestAt: now,
          earnings: {
            ...state.earnings,
            cashoutBalanceCents: state.earnings.cashoutBalanceCents - cents,
          },
        });
      },

      withdrawInvestment: () => {
        const state = get();
        if (state.investedCents <= 0) return;
        set({
          earnings: {
            ...state.earnings,
            cashoutBalanceCents: state.earnings.cashoutBalanceCents + state.investedCents,
          },
          investedCents: 0,
          investmentPrincipal: 0,
          lastInterestAt: 0,
        });
      },

      tickRivals: (elapsedMs) => {
        // Cap catch-up at 5 days to avoid massive jumps after long absence
        const cappedMs = Math.min(elapsedMs, 5 * 24 * 60 * 60 * 1000);
        if (cappedMs <= 0) return [];

        const state = get();
        const playerLifetime = state.earnings.lifetimeCents;
        const totalQ = state.totalQuestionsAnswered ?? 0;

        // Derive the player's earning rate from their history.
        // Assume ~20s per question; rivals target ~45% of that rate at paceFactor 1.0.
        // Falls back to a small default so rivals still move before the player has history.
        const SECS_PER_Q = 20;
        const RIVAL_FRACTION = 0.85;
        const estimatedPlayMs = Math.max(totalQ * SECS_PER_Q * 1000, 60 * 1000);
        const playerRatePerMs = playerLifetime > 0
          ? playerLifetime / estimatedPlayMs
          : 4 / (60 * 1000); // fallback: 4¢/min

        const updatedEarnings = { ...state.rivalEarnings };
        const updatedLastActive = { ...state.rivalLastActive };
        const now = Date.now();
        const notifications: { id: string; name: string; emoji: string; earned: number }[] = [];

        for (const rival of RIVALS) {
          const rivalCents = updatedEarnings[rival.id] ?? 0;

          // Rubber-banding: rivals earn faster when behind, slower when ahead
          const gapCents = playerLifetime - rivalCents;
          const rubberBand = Math.min(2.0, Math.max(0.5, 1 + gapCents / 300));

          // Variance: ±25% so rivals don't all move in lockstep
          const variance = 0.75 + Math.random() * 0.5;

          const expected = playerRatePerMs * RIVAL_FRACTION * rival.paceFactor * rubberBand * variance * cappedMs;

          // Probabilistic rounding preserves fractional cents
          const base = Math.floor(expected);
          const earned = base + (Math.random() < (expected - base) ? 1 : 0);

          if (earned > 0) {
            updatedEarnings[rival.id] = rivalCents + earned;
            updatedLastActive[rival.id] = now - Math.floor(Math.random() * Math.min(cappedMs, 10 * 60 * 1000));
            notifications.push({ id: rival.id, name: rival.name, emoji: rival.emoji, earned });
          }
        }

        set({ rivalEarnings: updatedEarnings, rivalLastActive: updatedLastActive, rivalLastTick: now });
        return notifications;
      },

      restoreOrCreateProfile: async (name, avatar, pin) => {
        try {
          const userId = await deriveUserId(name, pin);
          const cloud = await loadCloudState(userId);
          if (cloud) {
            // Existing save found — restore it, update avatar in case it changed
            const restored = cloud.state as Record<string, unknown>;
            set({
              ...restored,
              profile: { ...(restored.profile as PlayerProfile), avatar },
              cloudUserId: userId,
              cloudSyncedAt: cloud.updatedAt,
            });
          } else {
            // No existing save — create fresh
            set({
              profile: {
                id: crypto.randomUUID(),
                name: name.trim(),
                avatar,
                dadPin: pin,
                createdAt: Date.now(),
              },
              earnings: { lifetimeCents: 0, cashoutBalanceCents: 0, sessionCents: 0, streak: 0 },
              progressBySubject: defaultProgressMap(),
              transactions: [],
              lastMilestoneCents: 0,
              totalQuestionsAnswered: 0,
              investedCents: 0,
              investmentPrincipal: 0,
              lastInterestAt: 0,
              rivalEarnings: {},
              rivalLastActive: {},
              rivalLastTick: 0,
              cloudUserId: userId,
              cloudSyncedAt: 0,
            });
          }
        } catch (e) {
          console.warn('Cloud lookup failed, creating profile offline', e);
          get().createProfile(name, avatar, pin);
        }
      },

      initCloud: async () => {
        // On app load when a profile already exists — re-derive the user ID
        try {
          const { profile } = get();
          if (!profile) return;
          const userId = await deriveUserId(profile.name, profile.dadPin);
          set({ cloudUserId: userId });
        } catch (e) {
          console.warn('Cloud init failed, running offline', e);
        }
      },

      syncToCloud: async () => {
        const state = get();
        if (!state.cloudUserId) return;
        try {
          const { initCloud, syncToCloud, restoreOrCreateProfile, toggleSound, createProfile,
            resetProfile, answerCorrect, answerWrong, setCurrentTier, startSession,
            requestCashout, verifyPin, invest, withdrawInvestment, applyInterest, tickRivals,
            ...serializable } = state;
          await saveCloudState(state.cloudUserId, serializable);
          set({ cloudSyncedAt: Date.now() });
        } catch (e) {
          console.warn('Cloud sync failed', e);
        }
      },

      applyInterest: () => {
        const state = get();
        if (state.investedCents <= 0 || state.lastInterestAt <= 0) return;
        const now = Date.now();
        // Cap elapsed time — interest only accrues for active app use, not idle real time
        const elapsed = Math.min(now - state.lastInterestAt, MAX_INTEREST_SESSION_MS);
        if (elapsed < 60 * 1000) return; // skip if less than 1 minute — avoid noise
        const hours = elapsed / (1000 * 60 * 60);
        const growth = Math.floor(state.investedCents * state.investmentRatePerHour * hours);
        if (growth <= 0) return;
        set({
          investedCents: state.investedCents + growth,
          lastInterestAt: now,
        });
      },
    }),
    {
      name: 'mindmoney-state',
    }
  )
);
