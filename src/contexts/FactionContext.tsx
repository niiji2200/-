import React, { createContext, useContext, useState, useEffect } from 'react';
import { Faction } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

export type WarStatusLevel = 'heaven_dom' | 'heaven_lead' | 'contested' | 'hell_lead' | 'hell_dom';

export interface WarDominanceInfo {
  level: WarStatusLevel;
  heavenPercentage: number;
  hellPercentage: number;
  heavenScore: number;
  hellScore: number;
  statusLabel: string;
  statusDescription: string;
  auraTitle: string;
}

interface FactionContextType {
  faction: Faction;
  isHeaven: boolean;
  setFaction: (faction: Faction) => void;
  showFactionModal: boolean;
  setShowFactionModal: (show: boolean) => void;
  openFactionModal: () => void;
  hasChosenFaction: boolean;
  // Live & Simulated Battle War Status
  liveHeavenPct: number;
  liveHellPct: number;
  heavenScore: number;
  hellScore: number;
  simulatedHeavenPct: number | null;
  setSimulatedHeavenPct: (pct: number | null) => void;
  // View Faction Filtering Scheme ("陣営を分けて見たときは悪魔の配色と天使の配色に代わるように")
  filterFaction: 'all' | 'heaven' | 'hell' | 'theme';
  setFilterFaction: (filter: 'all' | 'heaven' | 'hell' | 'theme') => void;
  // Post hiding settings ("天使もしくは悪魔の投稿自体を非表示に設定できる")
  hideHeavenPosts: boolean;
  setHideHeavenPosts: (hide: boolean | ((prev: boolean) => boolean)) => void;
  hideHellPosts: boolean;
  setHideHellPosts: (hide: boolean | ((prev: boolean) => boolean)) => void;
  // War display mode: click/tap to toggle actual score / win rate ("上部の全体的な勝率に実際の評価数がクリックまたはタップで表示されるようにしてほしい")
  showWarRawScore: boolean;
  toggleWarDisplayMode: () => void;
  viewHeavenPct: number;
  isViewHellLeading: boolean;
  isViewHellDominant: boolean;
  isHellLeading: boolean;
  isHellDominant: boolean;
  isHeavenDominant: boolean;
  isContested: boolean;
  warDominance: WarDominanceInfo;
}

const FactionContext = createContext<FactionContextType | undefined>(undefined);

export function FactionProvider({ children }: { children: React.ReactNode }) {
  const [faction, setFactionState] = useState<Faction>(() => {
    const saved = localStorage.getItem('yowane_faction');
    if (saved === 'heaven' || saved === 'hell') return saved;
    return 'heaven';
  });

  const [hasChosenFaction, setHasChosenFaction] = useState<boolean>(() => {
    return !!localStorage.getItem('yowane_faction');
  });

  const [showFactionModal, setShowFactionModal] = useState<boolean>(() => {
    return !localStorage.getItem('yowane_faction');
  });

  // View Faction Filtering Scheme ("陣営を分けて見たときは悪魔の配色と天使の配色に代わるように")
  const [filterFaction, setFilterFaction] = useState<'all' | 'heaven' | 'hell' | 'theme'>('all');

  // Post hiding preferences: "天使もしくは悪魔の投稿自体を非表示に設定できる"
  const [hideHeavenPosts, setHideHeavenPostsState] = useState<boolean>(() => {
    return localStorage.getItem('yowane_hide_heaven_posts') === 'true';
  });
  const [hideHellPosts, setHideHellPostsState] = useState<boolean>(() => {
    return localStorage.getItem('yowane_hide_hell_posts') === 'true';
  });

  const setHideHeavenPosts = (value: boolean | ((prev: boolean) => boolean)) => {
    setHideHeavenPostsState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('yowane_hide_heaven_posts', String(next));
      return next;
    });
  };

  const setHideHellPosts = (value: boolean | ((prev: boolean) => boolean)) => {
    setHideHellPostsState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('yowane_hide_hell_posts', String(next));
      return next;
    });
  };

  // Toggle actual score points vs win rate percentage
  const [showWarRawScore, setShowWarRawScore] = useState<boolean>(() => {
    return localStorage.getItem('yowane_show_war_raw_score') === 'true';
  });

  const toggleWarDisplayMode = () => {
    setShowWarRawScore(prev => {
      const next = !prev;
      localStorage.setItem('yowane_show_war_raw_score', String(next));
      return next;
    });
  };

  // Battle War Real-time stats
  const [heavenScore, setHeavenScore] = useState(0);
  const [hellScore, setHellScore] = useState(0);
  const [simulatedHeavenPct, setSimulatedHeavenPct] = useState<number | null>(null);

  const ymNow = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('ym', '==', ymNow));
    const unsub = onSnapshot(q, (snapshot) => {
      let hScore = 0;
      let lScore = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const postFaction = (data.faction as Faction) || 'hell';
        const score = (data.totalScore || 0) as number;
        if (postFaction === 'heaven') {
          hScore += score;
        } else {
          lScore += score;
        }
      });
      setHeavenScore(hScore);
      setHellScore(lScore);
    }, (err) => {
      console.warn("Battle war score listener notice:", err);
    });

    return () => unsub();
  }, [ymNow]);

  const totalScore = heavenScore + hellScore;
  const liveHeavenPct = totalScore > 0 ? Math.round((heavenScore / totalScore) * 100) : 50;
  const liveHellPct = 100 - liveHeavenPct;

  // Effective percentage used for visual atmosphere (uses simulated value if tester toggled it)
  const effectiveHeavenPct = simulatedHeavenPct !== null ? simulatedHeavenPct : liveHeavenPct;
  const effectiveHellPct = 100 - effectiveHeavenPct;

  // View scheme: When viewing by divided faction, dynamically switch to pure Angel or Devil scheme!
  const viewHeavenPct = filterFaction === 'heaven' ? 100 : filterFaction === 'hell' ? 0 : effectiveHeavenPct;
  const isViewHellLeading = viewHeavenPct < 50;
  const isViewHellDominant = viewHeavenPct <= 30;

  // Determine war dominance tier
  let level: WarStatusLevel = 'contested';
  let statusLabel = '互角';
  let statusDescription = '互角';
  let auraTitle = '互角';

  if (effectiveHeavenPct >= 70) {
    level = 'heaven_dom';
    statusLabel = '天使 圧倒';
    statusDescription = '天使優勢';
    auraTitle = '天使 圧倒';
  } else if (effectiveHeavenPct >= 55) {
    level = 'heaven_lead';
    statusLabel = '天使 リード';
    statusDescription = '天使リード';
    auraTitle = '天使 リード';
  } else if (effectiveHeavenPct <= 30) {
    level = 'hell_dom';
    statusLabel = '悪魔 圧倒';
    statusDescription = '悪魔優勢';
    auraTitle = '悪魔 圧倒';
  } else if (effectiveHeavenPct <= 45) {
    level = 'hell_lead';
    statusLabel = '悪魔 リード';
    statusDescription = '悪魔リード';
    auraTitle = '悪魔 リード';
  }

  const isHellLeading = effectiveHellPct > 50;
  const isHellDominant = effectiveHellPct >= 70;
  const isHeavenDominant = effectiveHeavenPct >= 65;
  const isContested = effectiveHeavenPct >= 40 && effectiveHeavenPct <= 60;

  const warDominance: WarDominanceInfo = {
    level,
    heavenPercentage: effectiveHeavenPct,
    hellPercentage: effectiveHellPct,
    heavenScore,
    hellScore,
    statusLabel,
    statusDescription,
    auraTitle,
  };

  const setFaction = (newFaction: Faction) => {
    setFactionState(newFaction);
    localStorage.setItem('yowane_faction', newFaction);
    setHasChosenFaction(true);
    setShowFactionModal(false);
  };

  const openFactionModal = () => setShowFactionModal(true);
  const isHeaven = faction === 'heaven';

  return (
    <FactionContext.Provider
      value={{
        faction,
        isHeaven,
        setFaction,
        showFactionModal,
        setShowFactionModal,
        openFactionModal,
        hasChosenFaction,
        liveHeavenPct,
        liveHellPct,
        heavenScore,
        hellScore,
        simulatedHeavenPct,
        setSimulatedHeavenPct,
        effectiveHeavenPct,
        effectiveHellPct,
        filterFaction,
        setFilterFaction,
        hideHeavenPosts,
        setHideHeavenPosts,
        hideHellPosts,
        setHideHellPosts,
        showWarRawScore,
        toggleWarDisplayMode,
        viewHeavenPct,
        isViewHellLeading,
        isViewHellDominant,
        isHellLeading,
        isHellDominant,
        isHeavenDominant,
        isContested,
        warDominance,
      }}
    >
      {children}
    </FactionContext.Provider>
  );
}

export function useFaction() {
  const context = useContext(FactionContext);
  if (!context) {
    throw new Error('useFaction must be used within a FactionProvider');
  }
  return context;
}
