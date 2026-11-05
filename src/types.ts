export type Faction = 'heaven' | 'hell';

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  faction?: Faction; // Current controlling/winning faction
  originalFaction?: Faction; // Initial faction when created
  winningFaction?: Faction; // Victorious faction comparing post vs reply evaluations
  themeTitle?: string;
  likeCount: number; // Empathy (共感) count
  cheerCount?: number; // Legacy cheer count
  replyLikeCount?: number; // Total empathy on conversion replies
  totalScore: number;
  conversionCount?: number;
  ym: string;
  createdAt: any;
  isAwarded: boolean;
  awardedRank?: number;
}

export interface PostConversion {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  faction: Faction; // The converter's faction
  targetFaction: Faction; // The faction being converted (opposite of original)
  text: string;
  likeCount: number;
  createdAt: any;
  ym?: string;
}

export interface Reaction {
  like: boolean;
  cheer: boolean;
}

export interface MonthlyTheme {
  id: string;
  month: number;
  title: string;
  subtitle: string;
  description: string;
  heavenPrompt: string;
  hellPrompt: string;
  tags: string[];
}

export interface FactionBattleStats {
  ym: string;
  heavenScore: number;
  hellScore: number;
  heavenPostCount: number;
  hellPostCount: number;
  heavenConversionCount: number;
  hellConversionCount: number;
  totalScore: number;
  leading: Faction | 'draw';
}
