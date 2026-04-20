import type {
  Question,
  GeneratedQuestion,
  TemplateQuestion,
  FixedQuestion,
  Subject,
  Tier,
  InTierLevel,
  SubjectProgress,
} from '../types';
import { QUESTIONS } from '../data/questions';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tracks the last source question served per subject so we don't serve it twice in a row.
const lastServedBySubject: Partial<Record<Subject, string>> = {};

function evalFormula(formula: string, params: Record<string, number>): number {
  const paramNames = Object.keys(params);
  const paramValues = Object.values(params);
  const fn = new Function(...paramNames, `return ${formula}`);
  return fn(...paramValues);
}

function generateFromTemplate(tmpl: TemplateQuestion): GeneratedQuestion {
  const generatedParams: Record<string, number> = {};
  for (const [key, range] of Object.entries(tmpl.params)) {
    generatedParams[key] = randInt(range.min, range.max);
  }

  let question = tmpl.template;
  for (const [key, value] of Object.entries(generatedParams)) {
    question = question.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }

  const answer = evalFormula(tmpl.answerFormula, generatedParams);
  const answerStr = String(answer);

  let options: string[] | undefined;
  if (tmpl.type === 'multiple_choice') {
    const wrongs = new Set<string>();
    while (wrongs.size < 3) {
      const offset = randInt(-3, 3);
      if (offset === 0) continue;
      const wrong = answer + offset;
      if (wrong >= 0 && wrong !== answer) wrongs.add(String(wrong));
    }
    options = shuffle([answerStr, ...wrongs]);
  }

  return {
    sourceId: tmpl.id,
    subject: tmpl.subject,
    topic: tmpl.topic,
    tier: tmpl.tier,
    type: tmpl.type,
    question,
    options,
    answer: answerStr,
    hint: tmpl.hint,
    explanation: tmpl.explanation,
  };
}

function fixedToGenerated(q: FixedQuestion): GeneratedQuestion {
  return {
    sourceId: q.id,
    subject: q.subject,
    topic: q.topic,
    tier: q.tier,
    type: q.type,
    passage: q.passage,
    question: q.question,
    visual: q.visual,
    options: q.options ? shuffle(q.options) : undefined,
    answer: q.answer,
    hint: q.hint,
    explanation: q.explanation,
  };
}

export function getNextQuestion(
  subject: Subject,
  progress: SubjectProgress,
  forceEasier: boolean = false
): GeneratedQuestion | null {
  const tier: Tier = forceEasier
    ? (Math.max(1, progress.currentTier - 1) as Tier)
    : progress.currentTier;

  const candidates = QUESTIONS.filter((q) => q.subject === subject && q.tier === tier);
  if (candidates.length === 0) {
    const fallback = QUESTIONS.filter((q) => q.subject === subject);
    if (fallback.length === 0) return null;
    const pick = fallback[randInt(0, fallback.length - 1)];
    return pick.kind === 'template' ? generateFromTemplate(pick) : fixedToGenerated(pick);
  }

  // Templates generate unique instances every time, so they always count as "fresh".
  // Only fixed questions are subject to the repeat-cooldown filter.
  const recentMs = 60 * 60 * 1000; // 1-hour cooldown keeps recently seen questions out of rotation
  const now = Date.now();
  const freshPool = candidates.filter((q) => {
    if (q.kind === 'template') return true;
    const lastSeen = progress.lastSeenQuestions[q.id] || 0;
    return now - lastSeen > recentMs;
  });

  const pool = freshPool.length > 0 ? freshPool : candidates;

  // Soft bias toward current in-tier level — don't strictly filter, weight it.
  // This prevents pool starvation when a single level has few questions.
  let preferredLevel: InTierLevel = 'easy';
  const correctCount = progress.rollingAccuracy.filter(Boolean).length;
  const total = progress.rollingAccuracy.length;
  if (total >= 3) {
    const acc = correctCount / total;
    if (acc > 0.75) preferredLevel = 'hard';
    else if (acc > 0.5) preferredLevel = 'medium';
  }

  // Weighted pool: preferred level gets 3 entries, others get 1 each.
  const weighted: typeof pool = [];
  for (const q of pool) {
    const weight = q.inTierLevel === preferredLevel ? 2 : 1;
    for (let i = 0; i < weight; i++) weighted.push(q);
  }
  const finalPool = weighted;

  // Avoid serving the exact same source question twice in a row (if alternatives exist).
  const lastId = lastServedBySubject[subject];
  const withoutLast = lastId ? finalPool.filter((q) => q.id !== lastId) : finalPool;
  const poolToUse = withoutLast.length > 0 ? withoutLast : finalPool;

  const pick = poolToUse[randInt(0, poolToUse.length - 1)];
  lastServedBySubject[subject] = pick.id;
  return pick.kind === 'template' ? generateFromTemplate(pick) : fixedToGenerated(pick);
}

export function getEasierQuestion(
  subject: Subject,
  progress: SubjectProgress
): GeneratedQuestion | null {
  return getNextQuestion(subject, progress, true);
}
