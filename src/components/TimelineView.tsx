import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Post, Faction } from '../types';
import { PostCard } from './PostCard';
import { useFaction } from '../contexts/FactionContext';
import { getWarThemePalette } from '../lib/colorGradation';
import { format } from 'date-fns';
import {
  Search,
  TrendingUp,
  Clock,
  User as UserIcon,
  SendHorizontal,
  PenLine,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TimelineViewProps {
  user: User;
  initialThemeTitle?: string | null;
  onNavigateToBattle?: () => void;
  isComposerOpen?: boolean;
  setIsComposerOpen?: (open: boolean) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export function TimelineView({
  user,
  initialThemeTitle,
  onNavigateToBattle,
  isComposerOpen: propIsComposerOpen,
  setIsComposerOpen: propSetIsComposerOpen,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: TimelineViewProps) {
  const {
    faction: myFaction,
    hideHeavenPosts,
    setHideHeavenPosts,
    hideHellPosts,
    setHideHellPosts,
    viewHeavenPct,
    isHellLeading
  } = useFaction();

  // Color scheme dynamically shifts to Angel or Devil when filtering by faction
  const palette = getWarThemePalette(viewHeavenPct);

  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [postName, setPostName] = useState(() => {
    return localStorage.getItem('yowane_default_username') || '';
  });
  const [postFaction, setPostFaction] = useState<Faction>(myFaction);
  const [customTheme, setCustomTheme] = useState<string>(initialThemeTitle || '');
  const [localComposerOpen, setLocalComposerOpen] = useState(false);
  const isComposerOpen = propIsComposerOpen !== undefined ? propIsComposerOpen : localComposerOpen;
  const setIsComposerOpen = propSetIsComposerOpen || setLocalComposerOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View controls
  const [sortMode, setSortMode] = useState<'newest' | 'popular'>('newest');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery || setLocalSearchQuery;

  // Keep postFaction synced with myFaction if changed from outside
  useEffect(() => {
    setPostFaction(myFaction);
  }, [myFaction]);

  useEffect(() => {
    if (initialThemeTitle) {
      setCustomTheme(initialThemeTitle);
      setIsComposerOpen(true);
    }
  }, [initialThemeTitle]);

  const now = new Date();

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );

    const unsub = onSnapshot(q, (snap) => {
      const newPosts: Post[] = [];
      snap.forEach(doc => {
        newPosts.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(newPosts);
    });

    return unsub;
  }, []);

  const ymNow = format(now, 'yyyy-MM');

  const displayedPosts = useMemo(() => {
    let filtered = posts;

    // Post Hiding Settings: "非表示の設定にしている場合は返信も含めて完全に非表示になるようにしてください。"
    if (hideHeavenPosts) {
      filtered = filtered.filter(p => p.faction !== 'heaven' && p.originalFaction !== 'heaven');
    }
    if (hideHellPosts) {
      filtered = filtered.filter(p => (p.faction || 'hell') !== 'hell' && (p.originalFaction || 'hell') !== 'hell');
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.text && p.text.toLowerCase().includes(q)) ||
        (p.userName && p.userName.toLowerCase().includes(q)) ||
        (p.themeTitle && p.themeTitle.toLowerCase().includes(q))
      );
    }

    // Sort order
    if (sortMode === 'popular') {
      filtered = [...filtered].sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
    }

    return filtered;
  }, [posts, sortMode, searchQuery, hideHeavenPosts, hideHellPosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        text: text.trim(),
        userId: user.uid,
        userName: postName.trim() || user.displayName || '名無し',
        userPhoto: user.photoURL || '',
        faction: postFaction,
        originalFaction: postFaction,
        winningFaction: postFaction,
        themeTitle: customTheme.trim(),
        likeCount: 0,
        cheerCount: 0,
        replyLikeCount: 0,
        totalScore: 0,
        conversionCount: 0,
        ym: ymNow,
        createdAt: serverTimestamp(),
        isAwarded: false
      });
      setText('');
      setCustomTheme('');
      if (postName.trim()) {
        localStorage.setItem('yowane_default_username', postName.trim());
      }
      setIsComposerOpen(false);
    } catch (err) {
      console.error(err);
      alert('投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPostHeaven = postFaction === 'heaven';

  return (
    <div className="space-y-3.5">
      {/* Post Composer Form (Toggled from the top sticky bar or War bar) */}
      {isComposerOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-3.5 sm:p-4 border flex flex-col gap-2.5 transition-all duration-300 shadow-2xs"
          style={{
            backgroundColor: palette.cardBg,
            borderColor: palette.cardBorder,
            color: palette.textColor
          }}
        >
          {/* Faction Selector + Name + Close Button */}
          <div
            className="flex items-center justify-between gap-2 pb-2 border-b"
            style={{ borderColor: palette.isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex rounded-xl p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setPostFaction('heaven')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  isPostHeaven
                    ? "bg-amber-400 text-amber-950 shadow-2xs"
                    : palette.isLightMode
                    ? "text-slate-500 hover:text-amber-600"
                    : "text-zinc-400 hover:text-amber-400"
                )}
              >
                天使
              </button>
              <button
                type="button"
                onClick={() => setPostFaction('hell')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  !isPostHeaven
                    ? "bg-rose-700 text-white shadow-2xs"
                    : palette.isLightMode
                    ? "text-slate-500 hover:text-rose-600"
                    : "text-zinc-400 hover:text-rose-400"
                )}
              >
                悪魔
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="お名前 (任意)"
                value={postName}
                onChange={e => setPostName(e.target.value)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-xl outline-none font-medium border max-w-[130px]",
                  palette.isLightMode
                    ? "bg-white/80 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-amber-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-zinc-700"
                )}
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  palette.isLightMode
                    ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                )}
                title="閉じる"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* User's custom theme input (お題はユーザー自身が考える) */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded border shrink-0",
                palette.isLightMode
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-zinc-850 text-amber-300 border-zinc-700"
              )}
            >
              お題
            </span>
            <input
              type="text"
              placeholder="お題・テーマ (任意、例:「今週の弱音」「小さな幸せ」など)"
              value={customTheme}
              onChange={e => setCustomTheme(e.target.value)}
              className={cn(
                "flex-1 text-xs px-2.5 py-1 rounded-xl outline-none font-medium border",
                palette.isLightMode
                  ? "bg-white/80 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-amber-400"
                  : "bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:border-zinc-700"
              )}
              maxLength={40}
            />
            {customTheme && (
              <button
                type="button"
                onClick={() => setCustomTheme('')}
                className="text-xs opacity-50 hover:opacity-100 px-1.5 py-0.5 rounded cursor-pointer"
                title="お題をクリア"
              >
                ✕
              </button>
            )}
          </div>

          {/* Text area */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={isPostHeaven ? '前向きな気持ちを投稿...' : '弱音や本音を投稿...'}
            className={cn(
              "w-full rounded-xl p-3 resize-none focus:outline-none min-h-[75px] border transition-all text-xs sm:text-sm font-medium",
              palette.isLightMode
                ? "bg-amber-50/30 border-amber-200/80 text-slate-800 placeholder-slate-400 focus:border-amber-400"
                : "bg-zinc-950/90 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-700"
            )}
            maxLength={500}
            autoFocus
          />

          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] opacity-60">
              {text.length}/500
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                  palette.isLightMode
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className={cn(
                  "px-5 py-2 rounded-xl font-black text-sm tracking-wider transition-all cursor-pointer disabled:opacity-40 shadow-xs",
                  isPostHeaven
                    ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                    : "bg-rose-700 text-white hover:bg-rose-600"
                )}
              >
                投稿
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Controls Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Active Search Pill if searching from top bar */}
          {searchQuery ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-2xs"
              style={{
                backgroundColor: palette.cardBg,
                borderColor: palette.cardBorder,
                color: palette.textColor
              }}
            >
              <Search size={13} className="text-amber-500 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-xs">検索中: 「{searchQuery}」</span>
              <button
                onClick={() => setSearchQuery('')}
                className="opacity-75 hover:opacity-100 p-0.5 ml-1 cursor-pointer font-black text-xs"
                title="検索を解除"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold opacity-70">
              全 {displayedPosts.length} 件
            </div>
          )}

          {/* Sort Toggle */}
          <div
            className="flex rounded-xl p-0.5 border shrink-0 ml-auto"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder
            }}
          >
            <button
              onClick={() => setSortMode('newest')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                sortMode === 'newest'
                  ? palette.isLightMode
                    ? "bg-amber-400 text-amber-950 shadow-2xs"
                    : "bg-zinc-800 text-white shadow-2xs"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              新着
            </button>
            <button
              onClick={() => setSortMode('popular')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                sortMode === 'popular'
                  ? palette.isLightMode
                    ? "bg-amber-400 text-amber-950 shadow-2xs"
                    : "bg-zinc-800 text-white shadow-2xs"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              人気
            </button>
          </div>
        </div>

        {/* Post Hiding Settings: "天使もしくは悪魔の投稿自体を非表示に設定できる" */}
        <div
          className="flex items-center gap-1.5 pt-1 flex-wrap text-xs border-t"
          style={{ borderColor: palette.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}
        >
          <span className="text-[11px] font-bold opacity-60 flex items-center gap-1 shrink-0">
            <EyeOff size={12} />
            <span>非表示設定:</span>
          </span>

          {/* Toggle Hide Angel Posts */}
          <button
            type="button"
            onClick={() => setHideHeavenPosts(prev => !prev)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
              hideHeavenPosts
                ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/50 font-black"
                : palette.isLightMode
                ? "bg-white/95 text-stone-700 border-stone-300 hover:bg-stone-100"
                : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-850"
            )}
            title={hideHeavenPosts ? "天使の投稿を表示に戻す" : "天使の投稿を非表示に設定"}
          >
            {hideHeavenPosts ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>天使を非表示 {hideHeavenPosts ? '(設定中)' : ''}</span>
          </button>

          {/* Toggle Hide Demon Posts */}
          <button
            type="button"
            onClick={() => setHideHellPosts(prev => !prev)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
              hideHellPosts
                ? "bg-rose-700 text-white border-rose-800 ring-2 ring-rose-500/50 font-black"
                : palette.isLightMode
                ? "bg-white/95 text-stone-700 border-stone-300 hover:bg-stone-100"
                : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-850"
            )}
            title={hideHellPosts ? "悪魔の投稿を表示に戻す" : "悪魔の投稿を非表示に設定"}
          >
            {hideHellPosts ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>悪魔を非表示 {hideHellPosts ? '(設定中)' : ''}</span>
          </button>

          {(hideHeavenPosts || hideHellPosts) && (
            <button
              type="button"
              onClick={() => {
                setHideHeavenPosts(false);
                setHideHellPosts(false);
              }}
              className="text-[11px] font-bold underline opacity-70 hover:opacity-100 cursor-pointer ml-auto shrink-0"
            >
              すべて表示に戻す
            </button>
          )}
        </div>

        {/* Informative notification when posts are hidden */}
        {(hideHeavenPosts || hideHellPosts) && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border bg-black/30 border-white/10 text-zinc-200">
            <span className="flex items-center gap-1.5 truncate">
              <EyeOff size={13} className="text-amber-400 shrink-0" />
              <span>
                {hideHeavenPosts && hideHellPosts
                  ? '天使と悪魔の両方の投稿を非表示に設定中'
                  : hideHeavenPosts
                  ? '天使の投稿を非表示に設定中'
                  : '悪魔の投稿を非表示に設定中'}
              </span>
            </span>
            <span className="opacity-70 text-[11px] shrink-0">
              {displayedPosts.length} 件表示中
            </span>
          </div>
        )}
      </div>

      {/* Posts Feed */}
      <div className="space-y-3">
        {displayedPosts.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center border space-y-1.5 shadow-2xs"
            style={{
              backgroundColor: palette.cardBg,
              borderColor: palette.cardBorder,
              color: palette.subTextColor
            }}
          >
            <p className="text-xs font-bold">投稿がまだありません</p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}
