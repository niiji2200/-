import React from 'react';
import { useFaction } from '../contexts/FactionContext';
import { Faction } from '../types';
import { Swords, X, Check, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

export function FactionSelectModal() {
  const { faction, setFaction, showFactionModal, setShowFactionModal, hasChosenFaction } = useFaction();

  if (!showFactionModal) return null;

  const handleSelect = (selected: Faction) => {
    setFaction(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-black border border-zinc-900 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col gap-4">
        {hasChosenFaction && (
          <button
            onClick={() => setShowFactionModal(false)}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
            <Swords size={16} className="text-rose-500" />
            <span>陣営を選択</span>
          </h2>
          <p className="text-zinc-400 text-xs">
            いつでも変更できます
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Heaven Card */}
          <div
            onClick={() => handleSelect('heaven')}
            className={cn(
              "cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between",
              faction === 'heaven' && hasChosenFaction
                ? "bg-amber-50 text-slate-900 border-amber-400 ring-2 ring-amber-400/50 shadow-md"
                : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-200"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Sun size={24} className="text-amber-500" />
                {faction === 'heaven' && hasChosenFaction && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950">
                    選択中
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm">天使</h3>
                <p className="text-[11px] opacity-75 mt-0.5">白金・前向き</p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('heaven');
              }}
              className="mt-3 w-full py-1.5 px-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-amber-950 transition-all cursor-pointer"
            >
              選ぶ
            </button>
          </div>

          {/* Hell Card */}
          <div
            onClick={() => handleSelect('hell')}
            className={cn(
              "cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between",
              faction === 'hell' && hasChosenFaction
                ? "bg-black text-rose-100 border-rose-600 ring-2 ring-rose-600/40 shadow-md"
                : "bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-200"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Moon size={24} className="text-rose-500" />
                {faction === 'hell' && hasChosenFaction && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                    選択中
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm">悪魔</h3>
                <p className="text-[11px] opacity-75 mt-0.5">暗黒・弱音と本音</p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('hell');
              }}
              className="mt-3 w-full py-1.5 px-2 rounded-xl font-bold text-xs bg-rose-700 hover:bg-rose-600 text-white transition-all cursor-pointer"
            >
              選ぶ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
