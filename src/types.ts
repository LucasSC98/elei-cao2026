export type GameId = 'runner' | 'larapio' | 'luta';
export type FightCharacter = 'flaviete' | 'lulete';

export type GameResult = {
  title: string;
  message: string;
  actionLabel: string;
  stamp?: string;
  stats?: {
    money?: number;
    time?: number;
    level?: number;
    score?: number;
    caughtBy?: string;
  };
  quote?: string;
};

export type GameModule = {
  start: () => void;
  stop: () => void;
  destroy: () => void;
  spawnAlienadoDonation?: (side: 'left' | 'right' | 'bottom-left' | 'bottom-right') => void;
};
