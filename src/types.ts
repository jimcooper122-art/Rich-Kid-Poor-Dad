export type Subject = 'math' | 'logic' | 'reading' | 'science' | 'engineering';
export type Tier = 1 | 2 | 3 | 4 | 5 | 6;
export type QuestionType = 'multiple_choice' | 'number_input' | 'true_false';
export type InTierLevel = 'easy' | 'medium' | 'hard';

export interface Visual {
  type: 'none' | 'emoji' | 'dots' | 'fraction_shape' | 'clock' | 'coins' | 'image';
  data?: Record<string, any>;
}

export interface FixedQuestion {
  id: string;
  kind: 'fixed';
  subject: Subject;
  topic: string;
  tier: Tier;
  inTierLevel: InTierLevel;
  type: QuestionType;
  passage?: string;
  question: string;
  visual?: Visual;
  options?: string[];
  answer: string;
  hint: string;
  explanation: string;
}

export interface TemplateParam {
  min: number;
  max: number;
}

export interface TemplateQuestion {
  id: string;
  kind: 'template';
  subject: Subject;
  topic: string;
  tier: Tier;
  inTierLevel: InTierLevel;
  type: QuestionType;
  template: string;
  params: Record<string, TemplateParam>;
  answerFormula: string;
  wrongAnswerStrategy: 'near_miss' | 'random_in_range';
  hint: string;
  explanation: string;
}

export type Question = FixedQuestion | TemplateQuestion;

export interface GeneratedQuestion {
  sourceId: string;
  subject: Subject;
  topic: string;
  tier: Tier;
  type: QuestionType;
  passage?: string;
  question: string;
  visual?: Visual;
  options?: string[];
  answer: string;
  hint: string;
  explanation: string;
}

export interface Rival {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  paceFactor: number;
  trashTalk: string[];
  congratsMessages: string[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  dadPin: string;
  createdAt: number;
}

export interface SubjectProgress {
  currentTier: Tier;
  unlockedTier: Tier;
  rollingAccuracy: boolean[];
  questionsAnswered: number;
  questionsCorrect: number;
  consecutiveWrong: number;
  lastSeenQuestions: Record<string, number>;
}

export interface Earnings {
  lifetimeCents: number;
  cashoutBalanceCents: number;
  sessionCents: number;
  streak: number;
}

export interface Transaction {
  id: string;
  amountCents: number;
  requestedCents: number;
  date: number;
  note?: string;
}

export interface GameState {
  profile: PlayerProfile | null;
  earnings: Earnings;
  progressBySubject: Record<Subject, SubjectProgress>;
  transactions: Transaction[];
}
