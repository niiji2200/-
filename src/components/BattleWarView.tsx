import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Faction } from '../types';
import { getMonthlyTheme } from '../lib/themes';
import { useFaction } from '../contexts/FactionContext';
import { getWarThemePalette } from '../lib/colorGradation';
import { Swords, Trophy, Crown, Calendar, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { cn } from '../lib/utils';

interface BattleWarViewProps {
  user: User;
  onGoToTimelineWithTheme?: (themeTitle: string) => void;
}

export function BattleWarView({ user, onGoToTimelineWithTheme }: BattleWarViewProps) {
  const { faction: myFaction, isHeaven: isUserHeaven, isHellLeading, isHeavenDominant, effectiveHeavenPct, openFactionModal } = useFaction();
  const palette = getWarThemePalette(effectiveHeavenPct);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);

  // Stats for the chosen month
  const [heavenScore, setHeavenScore] = useState(0);
  const [hellScore, setHellScore] = useState(0);
  const [heavenPostCount, setHeavenPostCount] = useState(0);
  const [hellPostCount, setHellPostCount] = useState(0);
  const [heavenConversionCount, setHeavenConversionCount] = useState(0);
  const [hellConversionCount, setHellConversionCount] = useState(0);

  const ym = format(selectedMonth, 'yyyy-MM');
  const isCurrentMonth = ym === format(new Date(), 'yyyy-MM');
  const monthlyTheme = getMonthlyTheme(selectedMonth);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchScores = async () => {
      try {
        const q = query(collection(db, 'posts'), where('ym', '==', ym));
        const snap = await getDocs(q);

        let hScore = 0;
        let lScore = 0;
        let hPosts = 0;
        let lPosts = 0;
        let hConvs = 0;
        let lConvs = 0;

        await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const originalFaction = (data.originalFaction || data.faction || 'hell') as Faction;
            const targetFaction = originalFaction === 'heaven' ? 'hell' : 'heaven';
            const originalLikes = (data.likeCount || 0) as number;

            let replyLikes = 0;
            let convCount = 0;

            try {
              const convSnap = await getDocs(collection(db, 'posts', docSnap.id, 'conversions'));
              convSnap.forEach((cDoc) => {
                const cData = cDoc.data();
                replyLikes += (cData.likeCount || 0) as number;
                convCount += 1;
              });
            } catch (e) {
              // Ignore
            }

            // "元の投稿の評価と返信の評価数が大きい方の陣営を比べて、その後その投稿全ての評価は勝利した陣営の者となる"
            const winningFaction: Faction = (convCount > 0 && replyLikes > originalLikes)
              ? targetFaction
              : originalFaction;

            const postTotalScore = originalLikes + replyLikes;

            if (winningFaction === 'heaven') {
              hScore += postTotalScore;
            } else {
              lScore += postTotalScore;
            }

            if (originalFaction === 'heaven') {
              hPosts += 1;
            } else {
              lPosts += 1;
            }

            if (convCount > 0) {
              if (targetFaction === 'heaven') {
                hConvs += convCount;
              } else {
                lConvs += convCount;
              }
            }
          })
        );

        if (isMounted) {
          setHeavenScore(hScore);
          setHellScore(lScore);
          setHeavenPostCount(hPosts);
          setHellPostCount(lPosts);
          setHeavenConversionCount(hConvs);
          setHellConversionCount(lConvs);
        }
      } catch (err) {
        console.error('Failed to calculate battle scores', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchScores();
    return () => { isMounted = false; };
  }, [ym]);

  const totalScore = heavenScore + hellScore;
  const heavenPercentage = totalScore > 0 ? Math.round((heavenScore / totalScore) * 100) : 50;
  const hellPercentage = 100 - heavenPercentage;

  const isHeavenLeading = heavenScore > hellScore;
  const isHellLeadingScore = hellScore > heavenScore;

  const now = new Date();
  const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(0, lastDayOfMonth - now.getDate()) : 0;

  return (
    <div className="space-y-3.5">
      {/* Month Navigation Header */}
      <div
        className="rounded-2xl p-3 border shadow-2xs flex items-center justify-between transition-colors"
        style={{
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          color: palette.textColor
        }}
      >
        <button
          onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          className={cn(
            "p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors",
            palette.isLightMode
              ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
          )}
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{ym.split('-')[0]}年{ym.split('-')[1]}月</span>
          {isCurrentMonth ? (
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              開催中
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              終了
            </span>
          )}
        </div>

        <button
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          className={cn(
            "p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors",
            palette.isLightMode
              ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
          )}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Hero Battle Gauge Card */}
      <div
        className="rounded-2xl p-4 sm:p-5 border shadow-2xs space-y-3.5 transition-colors"
        style={{
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          color: palette.textColor
        }}
      >
        <div className="flex items-center justify-between">
          <div className="font-bold text-base flex items-center gap-1.5">
            {isCurrentMonth ? (
              isHeavenLeading ? (
                <span className="text-amber-400">天使リード</span>
              ) : isHellLeadingScore ? (
                <span className="text-rose-400">悪魔リード</span>
              ) : (
                <span className="text-zinc-300">互角</span>
              )
            ) : (
              isHeavenLeading ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Crown size={16} /> 天使勝利
                </span>
              ) : isHellLeadingScore ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <Crown size={16} /> 悪魔勝利
                </span>
              ) : (
                <span className="text-zinc-300">引き分け</span>
              )
            )}
          </div>
          {isCurrentMonth && (
            <span className="text-[11px] opacity-60">
              残り{daysLeft}日
            </span>
          )}
        </div>

        {/* Faction Score Comparison */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Heaven Box */}
          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-between",
            isHellLeading
              ? "bg-[#06060a] border-zinc-900 text-zinc-100"
              : isUserHeaven && isHeavenDominant
              ? "bg-amber-50/70 border-amber-200 text-slate-800"
              : "bg-[#141520] border-amber-500/25 text-zinc-100"
          )}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>天使</span>
              <span className="text-amber-400">{heavenPercentage}%</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 my-1">
              {heavenScore.toLocaleString()}<span className="text-xs font-normal ml-0.5">pt</span>
            </div>
            <div className="text-[10px] opacity-60 flex justify-between pt-1 border-t border-white/5">
              <span>投稿 {heavenPostCount}</span>
              <span>変更 {heavenConversionCount}</span>
            </div>
          </div>

          {/* Hell Box */}
          <div className={cn(
            "p-3 rounded-xl border flex flex-col justify-between",
            isHellLeading
              ? "bg-[#06060a] border-rose-950/80 ring-1 ring-rose-950/40 text-zinc-100"
              : isUserHeaven && isHeavenDominant
              ? "bg-rose-50/50 border-rose-200 text-slate-800"
              : "bg-[#141520] border-rose-500/25 text-zinc-100"
          )}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>悪魔</span>
              <span className="text-rose-400">{hellPercentage}%</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 my-1">
              {hellScore.toLocaleString()}<span className="text-xs font-normal ml-0.5">pt</span>
            </div>
            <div className="text-[10px] opacity-60 flex justify-between pt-1 border-t border-white/5">
              <span>投稿 {hellPostCount}</span>
              <span>変更 {hellConversionCount}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full bg-black/50 rounded-full overflow-hidden flex border border-white/5">
          <div
            style={{ width: `${heavenPercentage}%` }}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
          />
          <div
            style={{ width: `${hellPercentage}%` }}
            className="h-full bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 transition-all duration-500"
          />
        </div>

        {/* User faction status card */}
        <div className={cn(
          "p-2.5 rounded-xl border flex items-center justify-between text-xs",
          isHellLeading
            ? "bg-zinc-950 border-zinc-900 text-zinc-300"
            : isUserHeaven && isHeavenDominant
            ? "bg-amber-50/60 border-amber-200 text-slate-800"
            : "bg-[#0b0c10] border-zinc-800 text-zinc-300"
        )}>
          <div className="flex items-center gap-1.5 font-bold">
            <span>所属:</span>
            <span>{myFaction === 'heaven' ? '天使' : '悪魔'}</span>
          </div>

          <button
            onClick={openFactionModal}
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer"
          >
            変更
          </button>
        </div>
      </div>

      {/* Simplified Monthly Theme Card */}
      <div
        className="rounded-2xl p-3.5 border space-y-2 transition-colors shadow-2xs"
        style={{
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          color: palette.textColor
        }}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-500">
            <Trophy size={13} />
            <span>今月のお題</span>
          </div>
          <span className="text-[11px] opacity-60">
            {ym.split('-')[1]}月
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-xs sm:text-sm truncate">
            {monthlyTheme.title}
          </p>

          {isCurrentMonth && onGoToTimelineWithTheme && (
            <button
              onClick={() => onGoToTimelineWithTheme(monthlyTheme.title)}
              className={cn(
                "py-1 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 shadow-2xs",
                palette.isLightMode
                  ? "bg-amber-400 hover:bg-amber-300 text-amber-950"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              )}
            >
              投稿
            </button>
          )}
        </div>
      </div>

      {/* Minimal Rules */}
      <div className={cn(
        "rounded-2xl p-3.5 border text-xs space-y-1.5",
        isHellLeading
          ? "bg-black/80 border-zinc-900 text-zinc-400"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/80 border-amber-200 text-slate-600"
          : "bg-[#111218] border-zinc-800 text-zinc-400"
      )}>
        <div className="font-bold flex items-center gap-1 text-slate-300">
          <HelpCircle size={13} />
          ルール
        </div>
        <div className="space-y-0.5 text-[11px]">
          <div>・投稿と共感でポイント獲得</div>
          <div>・相手の投稿を変更してポイント獲得</div>
          <div>・月末にポイントの多い陣営が勝利</div>
        </div>
      </div>
    </div>
  );
}
