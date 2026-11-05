/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, loginAnonymously } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TimelineView } from './components/TimelineView';
import { BattleWarView } from './components/BattleWarView';
import { RankingView } from './components/RankingView';
import { MyPageView } from './components/MyPageView';
import { FactionProvider, useFaction } from './contexts/FactionContext';
import { FactionSelectModal } from './components/FactionSelectModal';
import { BackgroundArtwork } from './components/BackgroundArtwork';
import { WarStatusBar } from './components/WarStatusBar';
import { getWarThemePalette } from './lib/colorGradation';
import { Heart, Trophy, Loader2, AlertCircle, User as UserIcon, Search } from 'lucide-react';
import { cn } from './lib/utils';

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'battle' | 'ranking' | 'mypage'>('timeline');
  const [selectedThemeForTimeline, setSelectedThemeForTimeline] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const {
    isHeaven,
    openFactionModal,
    viewHeavenPct,
    isViewHellLeading,
    isViewHellDominant,
    isHellLeading,
    isHellDominant,
    isHeavenDominant
  } = useFaction();

  // Smooth White -> Grey -> Black gradation palette (Dynamically shifts to Angel/Devil scheme when filtering by faction)
  const palette = getWarThemePalette(viewHeavenPct);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        try {
          await loginAnonymously();
        } catch (err: any) {
          console.error("Anonymous login failed", err);
          if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
             setAuthError("Firebaseコンソールで「匿名（Anonymous）」ログインが有効になっていません。");
          } else {
             setAuthError(err.message || "ログイン処理に失敗しました。");
          }
          setLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const handleGoToTimelineWithTheme = (themeTitle: string) => {
    setSelectedThemeForTimeline(themeTitle);
    setIsComposerOpen(true);
    setActiveTab('timeline');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleComposer = () => {
    if (activeTab !== 'timeline') {
      setActiveTab('timeline');
      setIsComposerOpen(true);
    } else {
      setIsComposerOpen(prev => !prev);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSearch = () => {
    if (!isSearchOpen && activeTab !== 'timeline') {
      setActiveTab('timeline');
    }
    setIsSearchOpen(prev => !prev);
  };

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4">
         <div className="max-w-md w-full bg-slate-900 rounded-3xl shadow-sm border border-red-500/20 p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-200">設定が必要です</h2>
            <p className="text-slate-400 text-sm">{authError}</p>
            <div className="bg-slate-950 p-4 rounded-xl text-left text-sm text-slate-400 border border-slate-800">
               <p className="font-bold text-slate-300 mb-2">解決方法：</p>
               <ol className="list-decimal pl-4 space-y-2">
                 <li>Firebase Consoleを開く</li>
                 <li>「Authentication」を選択</li>
                 <li>「Sign-in method」タブを開く</li>
                 <li>「新しいプロバイダを追加」から「匿名（Anonymous）」を選択し、有効にして保存</li>
                 <li>この画面を再読み込みする</li>
               </ol>
            </div>
         </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-700"
        style={{ backgroundColor: palette.backgroundColor }}
      >
        <Loader2 className={cn("animate-spin", isHeaven ? "text-amber-500" : "text-rose-500")} size={48} />
      </div>
    );
  }

  // Smooth White -> Grey -> Black transition with floating Background Artwork (Flower growth & ethereal silhouettes)
  return (
    <div
      className="min-h-screen pb-20 md:pb-6 font-sans transition-colors duration-700 relative overflow-x-clip"
      style={{
        backgroundColor: palette.backgroundColor,
        color: palette.textColor
      }}
    >
      <FactionSelectModal />

      {/* Flower Growth Process & Heaven/Hell Background Illustration */}
      <BackgroundArtwork heavenPct={viewHeavenPct} />

      {/* Hell Leading Dark Vignette (Only subtle depth when Hell dominates or viewing Devil) */}
      {isViewHellLeading && (
        <div
          className={cn(
            "fixed inset-0 pointer-events-none z-10 transition-all duration-1000",
            isViewHellDominant
              ? "shadow-[inset_0_0_160px_rgba(0,0,0,0.95)]"
              : "shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]"
          )}
        />
      )}

      {/* App Header (Sticky top bar that remains visible as the user scrolls) */}
      <header
        className="sticky top-0 z-40 border-b transition-all duration-500 backdrop-blur-md shadow-2xs"
        style={{
          backgroundColor: palette.headerBg,
          borderColor: palette.headerBorder
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-13 sm:h-14 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isHellLeading ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
              )}
            />
            <span
              className={cn(
                "font-extrabold text-base sm:text-xl tracking-tight shrink-0",
                palette.isLightMode ? "text-amber-950" : "text-white"
              )}
            >
              Yowane
            </span>
          </div>

          {/* Right actions: Search Button + 投稿 button + Faction Button (Well-spaced for mobile & desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search Button in Top Bar */}
            <button
              onClick={handleToggleSearch}
              className={cn(
                "flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                isSearchOpen || searchQuery
                  ? palette.isLightMode
                    ? "bg-amber-100 text-amber-950 border-amber-400 font-black shadow-xs"
                    : "bg-zinc-850 text-amber-300 border-amber-500/60 font-black shadow-xs"
                  : palette.isLightMode
                  ? "bg-white/90 hover:bg-stone-100 text-stone-900 border-stone-300"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
              )}
              title={isSearchOpen ? "検索を閉じる" : "検索を開く"}
            >
              <Search size={15} className={searchQuery ? "text-amber-500" : undefined} />
              <span className="hidden sm:inline">検索</span>
              {searchQuery && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              )}
            </button>

            {/* 投稿 Button (Spacious touch target) */}
            <button
              onClick={handleToggleComposer}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all duration-200 cursor-pointer shadow-xs hover:scale-105 active:scale-95 border",
                isHeaven
                  ? "bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-300 shadow-amber-500/10"
                  : "bg-rose-700 hover:bg-rose-600 text-white border-rose-600 shadow-rose-900/20"
              )}
              title="投稿"
            >
              投稿
            </button>

            {/* Faction Switcher */}
            <button
              onClick={openFactionModal}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                palette.isLightMode
                  ? isHeaven
                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                    : "bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300"
                  : isHeaven
                  ? "bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-amber-500/40"
                  : "bg-zinc-900 hover:bg-zinc-800 text-rose-300 border-rose-500/40"
              )}
            >
              <span>{isHeaven ? '天使' : '悪魔'}</span>
            </button>
          </div>
        </div>


        {/* Current Strength Bar inside the sticky top bar (moves with scroll alongside search) */}
        <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pb-2 pt-0.5">
          <WarStatusBar />
        </div>

        {/* Collapsible Search Input in Top Bar (Opens and focuses when search button is clicked) */}
        {isSearchOpen && (
          <div className="max-w-2xl mx-auto px-4 pb-2.5 pt-1">
            <div
              className={cn(
                "relative flex items-center rounded-xl border px-3 py-1.5 shadow-sm transition-all",
                palette.isLightMode
                  ? "bg-white/95 border-stone-400 text-stone-900"
                  : "bg-zinc-900/95 border-zinc-700 text-white"
              )}
            >
              <Search size={15} className="mr-2 opacity-70 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="弱音や共感、お題を検索..."
                autoFocus
                className="bg-transparent border-none outline-none text-xs sm:text-sm w-full font-bold placeholder:font-normal placeholder-stone-400 dark:placeholder-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-1.5 py-0.5 text-xs opacity-75 hover:opacity-100 cursor-pointer font-bold mr-1"
                  title="クリア"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ml-1 shrink-0",
                  palette.isLightMode
                    ? "bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                )}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto p-3.5 sm:p-4 space-y-4 relative z-10">
        {activeTab === 'timeline' ? (
          <TimelineView
            user={user}
            initialThemeTitle={selectedThemeForTimeline}
            onNavigateToBattle={() => setActiveTab('battle')}
            isComposerOpen={isComposerOpen}
            setIsComposerOpen={setIsComposerOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        ) : activeTab === 'battle' ? (
          <BattleWarView
            user={user}
            onGoToTimelineWithTheme={handleGoToTimelineWithTheme}
          />
        ) : activeTab === 'ranking' ? (
          <RankingView user={user} />
        ) : (
          <MyPageView user={user} />
        )}
      </main>

      {/* Bottom Floating Navigation */}
      <div
        className="fixed bottom-0 inset-x-0 backdrop-blur-md border-t p-2 z-40 transition-colors md:sticky md:top-16 md:bg-transparent md:border-none md:p-3"
        style={{
          backgroundColor: palette.headerBg,
          borderColor: palette.headerBorder
        }}
      >
        <div className="max-w-2xl mx-auto flex gap-1.5 sm:gap-2 md:justify-center">
          <button
            onClick={() => {
              setSelectedThemeForTimeline(null);
              setActiveTab('timeline');
            }}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all border cursor-pointer",
              activeTab === 'timeline'
                ? isHellLeading
                  ? "bg-rose-700 text-white border-rose-500 shadow-xs font-black"
                  : "bg-amber-400 text-amber-950 border-amber-500 shadow-xs font-black"
                : palette.isLightMode
                ? "bg-white/95 text-stone-700 border-stone-300 hover:bg-stone-100 shadow-2xs font-bold"
                : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800 shadow-2xs font-bold"
            )}
          >
            <Heart size={15} className={activeTab === 'timeline' ? 'fill-current' : ''} />
            <span>ホーム</span>
          </button>

          <button
            onClick={() => setActiveTab('ranking')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all border cursor-pointer",
              activeTab === 'ranking'
                ? isHellLeading
                  ? "bg-rose-700 text-white border-rose-500 shadow-xs font-black"
                  : "bg-amber-400 text-amber-950 border-amber-500 shadow-xs font-black"
                : palette.isLightMode
                ? "bg-white/95 text-stone-700 border-stone-300 hover:bg-stone-100 shadow-2xs font-bold"
                : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800 shadow-2xs font-bold"
            )}
          >
            <Trophy size={15} className={activeTab === 'ranking' ? 'fill-current' : ''} />
            <span>順位</span>
          </button>

          <button
            onClick={() => setActiveTab('mypage')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all border cursor-pointer",
              activeTab === 'mypage'
                ? isHellLeading
                  ? "bg-rose-700 text-white border-rose-500 shadow-xs font-black"
                  : "bg-amber-400 text-amber-950 border-amber-500 shadow-xs font-black"
                : palette.isLightMode
                ? "bg-white/95 text-stone-700 border-stone-300 hover:bg-stone-100 shadow-2xs font-bold"
                : "bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800 shadow-2xs font-bold"
            )}
          >
            <UserIcon size={15} className={activeTab === 'mypage' ? 'fill-current' : ''} />
            <span>マイ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FactionProvider>
      <MainApp />
    </FactionProvider>
  );
}
