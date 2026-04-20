import type { Rival } from '../types';

export const RIVALS: Rival[] = [
  {
    id: 'bait',
    name: 'Bait',
    emoji: '🐟',
    personality: 'lovable underdog',
    paceFactor: 0.5,
    trashTalk: [
      "I'll get you... maybe... probably not.",
      "Don't feel bad for me. Okay, feel a little bad.",
    ],
    congratsMessages: [
      'Wow, you beat me! Again!',
      'I tried my best! Good job!',
    ],
  },
  {
    id: 'chum',
    name: 'Chum',
    emoji: '🐠',
    personality: 'scrappy competitor',
    paceFactor: 0.85,
    trashTalk: [
      "I'm right behind you. You can feel it, can't you?",
      "Better swim faster. I'm catching up.",
    ],
    congratsMessages: [
      "Lucky this time. I'll get you next season.",
      "You earned it. Barely.",
    ],
  },
  {
    id: 'mako',
    name: 'Mako',
    emoji: '🦈',
    personality: 'apex predator, main rival',
    paceFactor: 1.15,
    trashTalk: [
      "I eat sharks like you for breakfast. Wait. I AM a shark.",
      "You think you can beat ME? Cute.",
      "I'm ahead. I'm staying ahead.",
    ],
    congratsMessages: [
      "Fine. You got me. This season.",
      "I'm coming back harder. Watch me.",
    ],
  },
  {
    id: 'kraken',
    name: 'The Kraken',
    emoji: '🐙',
    personality: 'legendary final boss',
    paceFactor: 1.5,
    trashTalk: [
      'You are not ready for the depths.',
      'I have earned fortunes beyond your imagination.',
      'Return when you are worthy.',
    ],
    congratsMessages: [
      'Impossible... you defeated me?',
      'The legend of your rise will be told.',
    ],
  },
];
