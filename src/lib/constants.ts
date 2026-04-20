import type { Tier } from '../types';

export const TIER_CENTS: Record<Tier, number> = {
  1: 4,
  2: 6,
  3: 9,
  4: 13,
  5: 17,
  6: 22,
};

export const TIER_NAMES: Record<Tier, string> = {
  1: 'Rookie',
  2: 'Challenger',
  3: 'Pro',
  4: 'Elite',
  5: 'Legendary',
  6: 'GOD MODE',
};

// Questions needed at each tier before unlocking the next.
// Larger windows = more time spent at each tier before promotion.
export const UNLOCK_WINDOWS: Record<Tier, number> = {
  1: 20,
  2: 28,
  3: 40,
  4: 50,
  5: 60,
  6: 60, // already max tier — unused but satisfies the type
};

export const STREAK_MULTIPLIERS = [
  { threshold: 10, multiplier: 5 },
  { threshold: 7,  multiplier: 3 },
  { threshold: 5,  multiplier: 2 },
  { threshold: 3,  multiplier: 1.5 },
  { threshold: 0,  multiplier: 1 },
];

export const UNLOCK_ACCURACY_THRESHOLD = 0.8;
export const DROP_MISS_THRESHOLD = 5;
export const CONFIDENCE_RESET_TRIGGER = 2;
export const TIER_CLIMB_BACK_STREAK = 7; // consecutive correct answers needed to climb back after a drop
export const CASHOUT_MIN_CENTS = 100;

export const SUBJECTS = ['math', 'logic', 'reading', 'science', 'engineering'] as const;

// Investment — guaranteed savings model. Dad backs the returns.
// Interest only accrues while the app is open. Each app-open credits at most
// MAX_INTEREST_SESSION_MS of time so leaving the app closed for weeks doesn't
// result in a surprise windfall.
export const DEFAULT_INVESTMENT_RATE_PER_HOUR = 0.05; // 5% per hour of active app use
export const MAX_INTEREST_SESSION_MS = 2 * 60 * 60 * 1000; // cap at 2 hours per app open

export const AVATARS = ['🦸', '🥷', '🧙', '🦊', '🐉', '🦖', '🚀', '⚡', '🏆', '🎮'];

// Independent global level system — infinite, never resets
export const QUESTIONS_PER_LEVEL = 20;
