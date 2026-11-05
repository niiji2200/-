import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Post, Faction } from '../types';
import { PostCard } from './PostCard';
import { useFaction } from '../contexts/FactionContext';
import { Trophy, ChevronLeft, ChevronRight, Loader2, Sparkles, Swords, Crown } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { cn } from '../lib/utils';

interface RankingViewProps {
  user: User;
}

export function RankingView({ user }: RankingViewProps) {
  const { isHeaven: isUserHeaven, isHellLeading, isHeavenDominant } = useFaction();
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingFilter, setRankingFilter] = useState<'all' | 'heaven' | 'hell'>('all');

  // Holy War score tallies
  const [heavenTotal, setHeavenTotal] = useState(0);
  const [hellTotal, setHellTotal] = useState(0);

  // States for Purification Ceremony
  const [ritualStep, setRitualStep] = useState<'none' | 'intro' | 'animating' | 'done'>('none');
  const [unprocessedTop3, setUnprocessedTop3] = useState<Post[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [rising, setRising] = useState(false);

  const ym = format(currentDate, 'yyyy-MM');
  const isCurrentMonth = ym === format(new Date(), 'yyyy-MM');

  const handleStartDemoRitual = () => {
    const demoPosts: Post[] = [
      {
        id: 'demo-1',
        text: '毎日毎日、満員電車に乗って何のために働いているのか分からなくなる。',
        userName: '雨降りの帰り道',
        userPhoto: '',
        userId: 'demo-user-1',
        faction: 'hell',
        likeCount: 130,
        totalScore: 130,
        ym: ym,
        createdAt: new Date(),
        isAwarded: false
      },
      {
        id: 'demo-2',
        text: '誰にも認められない努力を続けるのが、もう限界かもしれない。',
        userName: '夜空の星',
        userPhoto: '',
        userId: 'demo-user-2',
        faction: 'hell',
        likeCount: 99,
        totalScore: 99,
        ym: ym,
        createdAt: new Date(),
        isAwarded: false
      },
      {
        id: 'demo-3',
        text: '周りと自分を比べてしまって、自分がちっぽけに感じてつらい。',
        userName: '静寂の月',
        userPhoto: '',
        userId: 'demo-user-3',
        faction: 'hell',
        likeCount: 74,
        totalScore: 74,
        ym: ym,
        createdAt: new Date(),
        isAwarded: false
      }
    ];

    setUnprocessedTop3(posts.length >= 3 ? posts.slice(0, 3) : demoPosts);
    setIsDemoMode(true);
    setRitualStep('intro');
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchAndProcessRanking = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'posts'),
          where('ym', '==', ym),
          orderBy('totalScore', 'desc')
        );
        const snap = await getDocs(q);
        const fetched: Post[] = [];
        let hTotal = 0;
        let lTotal = 0;

        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Post;
          fetched.push(item);
          if (item.faction === 'heaven') {
            hTotal += item.totalScore || 0;
          } else {
            lTotal += item.totalScore || 0;
          }
        });

        if (isMounted) {
          setHeavenTotal(hTotal);
          setHellTotal(lTotal);
        }
        
        // Dynamic Awards processing for PAST months only
        if (!isCurrentMonth && fetched.length > 0) {
          const top3 = fetched.slice(0, 3).filter(p => !p.isAwarded && p.totalScore > 0);
          
          if (top3.length > 0 && isMounted) {
            setUnprocessedTop3(top3);
            setRitualStep('intro');
          } else {
            setRitualStep('none');
          }
        } else {
          setRitualStep('none');
        }
        
        if (isMounted) {
          setPosts(fetched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAndProcessRanking();

    return () => { isMounted = false; };
  }, [ym, isCurrentMonth]);

  const handleStartRitual = () => {
    setRitualStep('animating');
    setRising(false);
    setTimeout(() => {
      setRising(true);
    }, 400);

    setTimeout(() => {
      setRitualStep('done');
    }, 5000);
  };

  const handleFinalizeRitual = async () => {
    setLoading(true);
    try {
      if (!isDemoMode) {
        const batch = writeBatch(db);

        unprocessedTop3.forEach((post, i) => {
          const rank = i + 1;
          const ref = doc(db, 'posts', post.id);

          batch.update(ref, {
            isAwarded: true,
            awardedRank: rank
          });
        });

        await batch.commit();

        setPosts(prev => prev.map(p => {
          const foundIndex = unprocessedTop3.findIndex(item => item.id === p.id);
          if (foundIndex !== -1) {
            return {
              ...p,
              isAwarded: true,
              awardedRank: foundIndex + 1
            };
          }
          return p;
        }));
      }

      setRitualStep('none');
      setIsDemoMode(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (rankingFilter === 'heaven') {
      list = list.filter(p => p.faction === 'heaven');
    } else if (rankingFilter === 'hell') {
      list = list.filter(p => (p.faction || 'hell') === 'hell');
    }
    return list.slice(0, 10);
  }, [posts, rankingFilter]);

  if (ritualStep === 'intro') {
    return (
      <div className={cn(
        "rounded-3xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden my-4 border shadow-xl",
        isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-300 text-slate-800 shadow-[0_10px_35px_rgba(245,158,11,0.15)]"
          : "bg-[#111218] border-zinc-800 text-zinc-100"
      )}>
        <Sparkles className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            先月（{ym}）の上位投稿の浄化式典
          </h2>
          <p className={cn("text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-medium", isUserHeaven && isHeavenDominant ? "text-slate-600" : "text-zinc-400")}>
            共感を集めた上位3つの投稿が天へと昇華し、美しく浄化されます。
          </p>
        </div>

        <div className={cn(
          "rounded-2xl p-4 border text-left max-w-md mx-auto space-y-3",
          isUserHeaven && isHeavenDominant ? "bg-amber-50/70 border-amber-200" : "bg-black/60 border-zinc-800"
        )}>
          <div className="text-xs text-amber-500 font-bold mb-2">浄化される上位投稿：</div>
          {unprocessedTop3.map((post, idx) => (
            <div key={post.id} className="flex gap-2.5 items-start text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <span className="font-extrabold text-amber-500 min-w-[20px]">#{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <span className="font-bold">{post.userName}</span>
                <p className="opacity-75 truncate mt-0.5">&ldquo;{post.text}&rdquo;</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStartRitual}
          className="w-full max-w-xs py-3 px-6 rounded-2xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 transition-all duration-300 shadow-md active:scale-95 animate-pulse cursor-pointer mx-auto block text-sm"
        >
          浄化式典を開始する
        </button>
      </div>
    );
  }

  if (ritualStep === 'animating') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-slate-950 opacity-95" />
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-72 h-full bg-gradient-to-b from-amber-300/40 via-yellow-500/10 to-transparent pointer-events-none blur-3xl animate-pulse" />
        
        <div className="text-center pt-10 z-10 space-y-2">
          <Sparkles className="w-10 h-10 text-white mx-auto animate-spin" style={{ animationDuration: '6s' }} />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-widest uppercase">
            昇華・浄化中...
          </h2>
          <p className="text-amber-200 text-xs sm:text-sm tracking-wider animate-pulse">
            魂の叫びが天へと昇華し、光に包まれていきます
          </p>
        </div>

        <div className="w-full max-w-md mx-auto z-10 flex-1 flex flex-col justify-end pb-32">
          <div 
            className={`space-y-6 w-full transform transition-all duration-[4200ms] ease-in-out ${
              rising ? '-translate-y-[125vh] scale-75 opacity-0 blur-sm' : 'translate-y-0 opacity-100 scale-100'
            }`}
          >
            {unprocessedTop3.map((post, idx) => (
              <div 
                key={post.id} 
                className="bg-white/95 text-slate-800 border border-amber-300 p-5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.2)] space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                    第{idx + 1}位
                  </div>
                  <span className="font-bold text-xs">{post.userName}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic line-clamp-3">
                  &ldquo;{post.text}&rdquo;
                </p>
                <div className="flex justify-end text-[10px] text-amber-700 font-bold">
                  スコア: {post.totalScore} pt
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pb-8 z-10">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto opacity-50" />
        </div>
      </div>
    );
  }

  if (ritualStep === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-amber-50 via-rose-50 to-amber-100/90 text-slate-800 flex flex-col justify-center items-center p-6 overflow-y-auto relative">
        <div className="max-w-md w-full text-center space-y-6 z-10 relative">
          <div className="space-y-3">
            <div className="inline-flex p-4 rounded-full bg-white shadow-md border border-amber-200 text-amber-500 animate-bounce">
              <Crown className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              浄化完了
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium max-w-sm mx-auto">
              上位投稿は天へと召され、浄化されました。記録は殿堂入りとして保存されます。
            </p>
          </div>

          <div className="space-y-3">
            {unprocessedTop3.map((post, idx) => (
              <div 
                key={post.id} 
                className="border border-amber-200 p-4 rounded-2xl text-left bg-white/95 shadow-md"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">第{idx + 1}位 殿堂入り</span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    {post.totalScore} pt
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">{post.userName}</div>
                <div className="text-xs text-rose-600 font-bold mt-1">投稿は浄化されました</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleFinalizeRitual}
            className="w-full py-3 px-6 rounded-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-md text-sm cursor-pointer"
          >
            完了する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Navigator Header */}
      <div className={cn(
        "rounded-2xl p-3 border flex items-center justify-between transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900 text-zinc-200"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-200 text-slate-800 shadow-2xs"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <button 
          onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
          className={cn(
            "p-1.5 rounded-lg border text-xs cursor-pointer transition-colors",
            isHellLeading ? "bg-zinc-900 border-zinc-800 text-zinc-300" : isUserHeaven && isHeavenDominant ? "hover:bg-amber-100 text-amber-900 border-amber-200" : "bg-zinc-900 text-zinc-400 border-zinc-800"
          )}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 font-bold text-sm">
          <Trophy className="text-yellow-500" size={16} />
          <span>{format(currentDate, 'yyyy年M月')}</span>
        </div>
        <button 
          onClick={() => !isCurrentMonth && setCurrentDate(prev => subMonths(prev, -1))}
          disabled={isCurrentMonth}
          className={cn(
            "p-1.5 rounded-lg border text-xs transition-colors disabled:opacity-30 cursor-pointer",
            isHellLeading ? "bg-zinc-900 border-zinc-800 text-zinc-300" : isUserHeaven && isHeavenDominant ? "hover:bg-amber-100 text-amber-900 border-amber-200" : "bg-zinc-900 text-zinc-400 border-zinc-800"
          )}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Monthly Victor Banner if past month */}
      {!isCurrentMonth && (heavenTotal > 0 || hellTotal > 0) && (
        <div className={cn(
          "rounded-2xl p-3 border text-center space-y-1 transition-colors",
          isHellLeading
            ? "bg-black/90 border-rose-950/80 text-zinc-200"
            : heavenTotal > hellTotal
            ? isUserHeaven && isHeavenDominant
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-[#141520] border-amber-500/30 text-white"
            : "bg-[#141520] border-rose-500/30 text-white"
        )}>
          <div className="text-xs font-bold">
            {heavenTotal > hellTotal ? (
              <span className="text-amber-400">天使の勝利 ({heavenTotal}pt vs {hellTotal}pt)</span>
            ) : hellTotal > heavenTotal ? (
              <span className="text-rose-400">悪魔の勝利 ({hellTotal}pt vs {heavenTotal}pt)</span>
            ) : (
              <span className="text-zinc-300">引き分け</span>
            )}
          </div>
        </div>
      )}

      {/* Faction Filter Tabs */}
      <div className={cn(
        "flex rounded-xl p-0.5 border transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900"
          : isUserHeaven && isHeavenDominant
          ? "bg-white border-amber-200"
          : "bg-[#111218] border-zinc-800"
      )}>
        <button
          onClick={() => setRankingFilter('all')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
            rankingFilter === 'all'
              ? isHellLeading
                ? "bg-zinc-800 text-white"
                : isUserHeaven && isHeavenDominant
                ? "bg-amber-400 text-amber-950 shadow-2xs"
                : "bg-zinc-800 text-white"
              : "opacity-60 hover:opacity-100"
          )}
        >
          総合 TOP10
        </button>
        <button
          onClick={() => setRankingFilter('heaven')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
            rankingFilter === 'heaven'
              ? "bg-amber-400 text-amber-950 shadow-2xs"
              : "opacity-60 hover:opacity-100"
          )}
        >
          <span>天使</span>
        </button>
        <button
          onClick={() => setRankingFilter('hell')}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
            rankingFilter === 'hell'
              ? "bg-rose-700 text-white shadow-2xs"
              : "opacity-60 hover:opacity-100"
          )}
        >
          <span>悪魔</span>
        </button>
      </div>

      {/* Demo Banner for Purification Animation */}
      <div className={cn(
        "rounded-2xl p-3 flex items-center justify-between gap-2 border transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900 text-zinc-200"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-200 text-slate-800 shadow-2xs"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold">
            上位投稿の浄化演出
          </span>
        </div>
        <button
          onClick={handleStartDemoRitual}
          className={cn(
            "text-xs px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer shadow-xs",
            isHellLeading
              ? "bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800"
              : isUserHeaven
              ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
              : "bg-purple-600/40 hover:bg-purple-600 text-purple-200 border border-purple-500/40"
          )}
        >
          デモ再生
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className={cn("animate-spin", isUserHeaven ? "text-amber-500" : "text-purple-500")} size={32} />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className={cn(
            "text-center py-10 rounded-3xl border text-sm font-medium",
            isUserHeaven ? "bg-white/80 border-amber-200 text-slate-500" : "bg-slate-900 border-slate-800 text-slate-500"
          )}>
            この月の該当投稿はありません。
          </div>
        ) : (
          filteredPosts.map((post, i) => (
            <div key={post.id} className="relative">
              {!post.isAwarded && (
                <div className={cn(
                  "absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md z-10 text-xs border",
                  i === 0 ? "bg-amber-400 border-amber-300 text-amber-950 font-black shadow-amber-300/50" :
                  i === 1 ? "bg-slate-200 border-slate-300 text-slate-700" :
                  i === 2 ? "bg-amber-600 border-amber-500 text-white" :
                  "bg-slate-800 border-slate-700 text-white"
                )}>
                  {i + 1}
                </div>
              )}
              <PostCard post={post} isRanking />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
