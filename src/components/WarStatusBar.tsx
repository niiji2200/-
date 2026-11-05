import React, { useState } from 'react';
import { useFaction } from '../contexts/FactionContext';
import { getWarThemePalette } from '../lib/colorGradation';
import { Sliders, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export function WarStatusBar() {
  const {
    effectiveHeavenPct,
    effectiveHellPct,
    heavenScore,
    hellScore,
    showWarRawScore,
    toggleWarDisplayMode,
    isHellLeading,
    warDominance,
    viewHeavenPct,
    simulatedHeavenPct,
    setSimulatedHeavenPct
  } = useFaction();

  const palette = getWarThemePalette(viewHeavenPct);
  const [showTestBar, setShowTestBar] = useState(false);
  const isSimulating = simulatedHeavenPct !== null;

  return (
    <section
      onClick={toggleWarDisplayMode}
      className="rounded-xl p-2 sm:p-2.5 border transition-all duration-300 shadow-2xs cursor-pointer select-none"
      title="タップで勝率/評価数を切替"
      style={{
        backgroundColor: palette.cardBg,
        borderColor: palette.cardBorder,
        color: palette.textColor
      }}
    >
      {/* Top Info Row */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5 gap-1.5">
        {/* Angel Side (Gold) */}
        <span className="flex items-center gap-1 text-amber-400 font-black tracking-tight whitespace-nowrap shrink-0">
          天使 {showWarRawScore ? heavenScore : `${effectiveHeavenPct}%`}
        </span>

        {/* Status Badge in Center */}
        <span
          className={cn(
            "text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black border tracking-tight shadow-2xs whitespace-nowrap",
            isHellLeading
              ? "bg-zinc-900 text-rose-300 border-rose-950"
              : palette.isLightMode
              ? "bg-amber-100 text-amber-900 border-amber-300"
              : "bg-zinc-900 text-zinc-300 border-zinc-800"
          )}
        >
          {warDominance.statusLabel}
        </span>

        {/* Devil Side (Rose) + Test Button */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-rose-400 font-black tracking-tight whitespace-nowrap">
            {showWarRawScore ? hellScore : `${effectiveHellPct}%`} 悪魔
          </span>

          {/* Test Button: Reveals the test bar when clicked */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTestBar((prev) => !prev);
            }}
            className={cn(
              "px-2 py-0.5 rounded-lg border text-[10px] sm:text-xs font-black cursor-pointer transition-all flex items-center gap-1 shadow-2xs",
              showTestBar || isSimulating
                ? "bg-amber-400 text-amber-950 border-amber-300 font-black"
                : palette.isLightMode
                ? "bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
            )}
            title="テスト用バーの表示・非表示"
          >
            <Sliders size={11} className={isSimulating ? "animate-pulse" : ""} />
            <span>テスト</span>
          </button>
        </div>
      </div>

      {/* 1-Line Progress Bar */}
      <div className="h-2 sm:h-2.5 w-full bg-black/60 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
        <div
          style={{ width: `${effectiveHeavenPct}%` }}
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 shadow-sm"
        />
        <div
          style={{ width: `${effectiveHellPct}%` }}
          className="h-full bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 transition-all duration-500 shadow-sm"
        />
      </div>

      {/* Test Bar (Appears when clicking the テスト button, with identical test features) */}
      {showTestBar && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "mt-3 p-3 rounded-xl border text-xs space-y-2.5 transition-all duration-200 animate-fadeIn cursor-default",
            palette.isLightMode
              ? "bg-stone-50 border-amber-300/80 text-stone-900 shadow-xs"
              : "bg-zinc-950/90 border-zinc-800 text-zinc-200 shadow-xs"
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1 text-amber-500 font-black">
              <Sparkles size={12} />
              戦況テスト・シミュレーター
            </span>
            {isSimulating && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                テスト中: {effectiveHeavenPct}%
              </span>
            )}
          </div>

          {/* Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-bold shrink-0">天使</span>
            <input
              type="range"
              min="0"
              max="100"
              value={effectiveHeavenPct}
              onChange={(e) => setSimulatedHeavenPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-700 rounded-lg"
            />
            <span className="text-[10px] text-rose-400 font-bold shrink-0">悪魔</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setSimulatedHeavenPct(85)}
              className={cn(
                "px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                effectiveHeavenPct === 85 && isSimulating
                  ? "bg-amber-400 text-amber-950 border-amber-300 font-black"
                  : "hover:bg-white/10 border-stone-400/40 text-stone-300"
              )}
            >
              天使85% (光の演出)
            </button>

            <button
              type="button"
              onClick={() => setSimulatedHeavenPct(50)}
              className={cn(
                "px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                effectiveHeavenPct === 50 && isSimulating
                  ? "bg-amber-400 text-amber-950 border-amber-300 font-black"
                  : "hover:bg-white/10 border-stone-400/40 text-stone-300"
              )}
            >
              互角 50%
            </button>

            <button
              type="button"
              onClick={() => setSimulatedHeavenPct(15)}
              className={cn(
                "px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                effectiveHeavenPct === 15 && isSimulating
                  ? "bg-rose-700 text-white border-rose-500 font-black"
                  : "hover:bg-white/10 border-stone-400/40 text-stone-300"
              )}
            >
              悪魔85% (火の演出)
            </button>

            <button
              type="button"
              onClick={() => setSimulatedHeavenPct(null)}
              className="px-2.5 py-1 rounded-lg border border-stone-400/40 hover:bg-white/10 ml-auto flex items-center gap-1 cursor-pointer text-stone-300 font-bold"
              title="実際の戦況に戻す"
            >
              <RotateCcw size={10} />
              <span>実戦況</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
