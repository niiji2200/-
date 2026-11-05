import React, { useState, useEffect, useMemo } from 'react';
import { Post } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { 
  Sparkles, 
  X, 
  Gamepad2, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Smile, 
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PurificationQuestProps {
  post: Post;
  onClose: () => void;
}

interface GameWord {
  id: string;
  original: string;
  purified: string;
  isNegative: boolean;
  x: number; // Percent width (10-90)
  y: number; // Percent height (20-80)
  status: 'idle' | 'active' | 'cleared';
  orderIndex: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
}

// Map negative/burden words to positive warm transformations
const PURIFICATION_TRANSFORMS: { [key: string]: string } = {
  "しんどい": "のんびりいこう",
  "疲れた": "たっぷり寝ようね",
  "つらい": "心が休まりますように",
  "嫌い": "あなたは尊いよ",
  "やめたい": "新しい道があるよ",
  "無理": "がんばらなくて大正解",
  "最悪": "これから好転するよ",
  "落ち込む": "明日は明日の風が吹く",
  "不安": "そっと包んであげる",
  "孤独": "ここに仲間がいるよ",
  "寂しい": "いつも見守っているよ",
  "失敗": "成長のあしあと",
  "ミス": "どんまい、大丈夫！",
  "嫌だ": "心の声を大切にしよう",
  "だるい": "だらだら充電タイム",
  "逃げたい": "逃げるのは最高の知恵",
  "苦しい": "深呼吸、すーはー",
  "悲しい": "涙の数だけ優しくなれる",
  "痛い": "なでなで、痛いの飛んでけ",
  "死にたい": "まずは美味しいものを食べてね",
  "消えたい": "ただそこにいるだけで100点",
  "辛い": "温かいお茶を飲もう",
  "ダメ": "そのままで完璧だよ",
  "だめ": "ありのままでいいんだよ",
  "うつ": "休むのが今のお仕事",
  "ストレス": "シャボン玉にして飛ばそう",
  "会社": "ただの生活の道具だよ",
  "学校": "あなたの世界はもっと広い",
  "仕事": "自分を一番にいたわろう",
  "人間関係": "無理に合わせなくていいよ",
  "上司": "聞き流してスルーしよう",
  "怒られた": "あなたは十分がんばった",
  "泣いた": "心のデトックス完了",
  "疲労": "極上のご自愛タイム",
  "絶望": "小さな光が灯るよ",
  "きつい": "自分をハグしてあげて",
  "泣く": "涙は心の浄化液",
  "イライラ": "深呼吸でリセット",
  "病気": "ゆっくり回復を待とう",
  "怒り": "エネルギーを自分磨きに",
};

// Generic affirmations to fallback when there is no direct mapping
const GENERIC_AFFIRMATIONS = [
  "あなたらしく生きていい",
  "いつでも味方だよ",
  "心がすっきり晴れる",
  "温かい光が包む",
  "すべては大丈夫に繋がる",
  "マイペースで歩もう",
  "今日はもうおしまい",
  "心の重荷をおろして"
];

// List of negative keywords to look for
const NEGATIVE_KEYWORDS = Object.keys(PURIFICATION_TRANSFORMS);

export function PurificationQuest({ post, onClose }: PurificationQuestProps) {
  const [words, setWords] = useState<GameWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'completed'>('playing');
  const [showErrorBubbleId, setShowErrorBubbleId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);
  const [showAffirmation, setShowAffirmation] = useState<string | null>(null);

  // Initialize game words from post content
  useEffect(() => {
    const text = post.text;
    const foundWords: { word: string; index: number; isNegative: boolean }[] = [];

    // 1. Search for exact negative dictionary matches
    NEGATIVE_KEYWORDS.forEach(keyword => {
      let startIndex = 0;
      while ((startIndex = text.indexOf(keyword, startIndex)) !== -1) {
        foundWords.push({
          word: keyword,
          index: startIndex,
          isNegative: true
        });
        startIndex += keyword.length;
      }
    });

    // 2. Extract key clauses/phrases from user's post text
    const segments = text.split(/[、。！？\s\n,.\?!]+/).filter(s => s.length >= 2 && s.length <= 15);
    
    segments.forEach(segment => {
      const isAlreadyFound = foundWords.some(fw => fw.word.includes(segment) || segment.includes(fw.word));
      if (!isAlreadyFound && foundWords.length < 5) {
        const textIndex = text.indexOf(segment);
        foundWords.push({
          word: segment,
          index: textIndex !== -1 ? textIndex : Math.random() * 100,
          isNegative: false
        });
      }
    });

    // Sort words by their appearance order (なぞる - Tracing sequence)
    foundWords.sort((a, b) => a.index - b.index);

    // Limit to 6 elements for an optimal gameplay length, ensure at least 3
    let selectedWords = foundWords.slice(0, 6);
    
    // Fallback if the post is extremely short
    if (selectedWords.length < 3) {
      const backupKeywords = ["心", "つらい気持ち", "弱音", "ため息", "明日", "夜"].slice(0, 3 - selectedWords.length);
      backupKeywords.forEach((word, idx) => {
        selectedWords.push({
          word,
          index: 50 + idx,
          isNegative: true
        });
      });
    }

    // Map to final game words with grid positioning
    const gameWords: GameWord[] = selectedWords.map((item, idx) => {
      let purified = PURIFICATION_TRANSFORMS[item.word];
      if (!purified) {
        purified = GENERIC_AFFIRMATIONS[Math.floor(Math.random() * GENERIC_AFFIRMATIONS.length)];
      }

      const cols = Math.min(selectedWords.length, 3);
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);

      const baseX = 18 + colIdx * (64 / (cols - 1 || 1));
      const baseY = 25 + rowIdx * 25;

      const x = Math.min(88, Math.max(12, baseX + ((idx % 2 === 0 ? 1 : -1) * 3)));
      const y = Math.min(78, Math.max(22, baseY + ((idx % 3 === 0 ? 1 : -1) * 2)));

      return {
        id: `word-${idx}-${Date.now()}`,
        original: item.word,
        purified,
        isNegative: item.isNegative,
        x,
        y,
        status: idx === 0 ? 'active' : 'idle',
        orderIndex: idx
      };
    });

    setWords(gameWords);
    setCurrentIndex(0);
    setScore(0);
    setGameState('playing');
  }, [post]);

  // Generate explosion particles
  const spawnExplosion = (x: number, y: number) => {
    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#f472b6'];
    const newParticles: Particle[] = Array.from({ length: 16 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: (i / 16) * 360,
      speed: Math.random() * 40 + 20
    }));

    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 900);
  };

  // Handle word node click
  const handleWordClick = async (word: GameWord) => {
    if (gameState !== 'playing') return;

    if (word.orderIndex === currentIndex) {
      // Correct Tracing Connection!
      spawnExplosion(word.x, word.y);
      setScore(prev => prev + 100);
      setShowAffirmation(word.purified);

      setTimeout(() => {
        setShowAffirmation(null);
      }, 2000);

      // Update word statuses
      setWords(prev => prev.map(w => {
        if (w.id === word.id) {
          return { ...w, status: 'cleared' };
        }
        if (w.orderIndex === currentIndex + 1) {
          return { ...w, status: 'active' };
        }
        return w;
      }));

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Check if game complete
      if (nextIndex === words.length) {
        setGameState('completed');
        await triggerCloudPurification();
      }
    } else if (word.status !== 'cleared') {
      setShowErrorBubbleId(word.id);
      setTimeout(() => {
        setShowErrorBubbleId(null);
      }, 500);
    }
  };

  // Triggers the real-time cloud stats update on Firestore to award +10 empathy count
  const triggerCloudPurification = async () => {
    setIsUpdatingDb(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likeCount: increment(10),
        totalScore: increment(10)
      });
    } catch (err) {
      console.error("Failed to apply cloud empathy bonus:", err);
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Restarts the game
  const handleRestart = () => {
    setWords(prev => prev.map((w, idx) => ({
      ...w,
      status: idx === 0 ? 'active' : 'idle'
    })));
    setCurrentIndex(0);
    setScore(0);
    setGameState('playing');
    setShowAffirmation(null);
  };

  // Draw lines between constellation stars
  const linesToDraw = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; isCleared: boolean }[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i];
      const next = words[i + 1];
      lines.push({
        x1: current.x,
        y1: current.y,
        x2: next.x,
        y2: next.y,
        isCleared: current.status === 'cleared' && next.status !== 'idle'
      });
    }
    return lines;
  }, [words]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col md:p-6 overflow-hidden">
      {/* Background Starry Sky */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950 opacity-95 pointer-events-none"></div>
      
      {/* Glowing cosmic auras */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      {/* Header bar */}
      <div className="z-10 flex items-center justify-between p-4 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600/20 text-purple-400 p-1.5 rounded-xl border border-purple-500/20">
            <Gamepad2 size={18} className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-100 tracking-wide">弱音浄化クエスト</h1>
            <p className="text-[10px] text-slate-500">
              {post.userName || '名無し'} さんの痛みをなぞって、星に変える
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-900 rounded-full text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 relative flex flex-col justify-between p-4 overflow-hidden select-none">
        
        {/* Constellation Canvas Backdrop */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80">
          <defs>
            <linearGradient id="glowingLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#e879f9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="clearedLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Connection Lines */}
          {linesToDraw.map((line, i) => (
            <g key={i}>
              <line
                x1={`${line.x1}%`}
                y1={`${line.y1}%`}
                x2={`${line.x2}%`}
                y2={`${line.y2}%`}
                stroke={line.isCleared ? "url(#clearedLine)" : "url(#glowingLine)"}
                strokeWidth={line.isCleared ? "3.5" : "1.5"}
                strokeDasharray={line.isCleared ? "0" : "4 4"}
                opacity={line.isCleared ? 0.9 : 0.35}
              />
              {line.isCleared && (
                <line
                  x1={`${line.x1}%`}
                  y1={`${line.y1}%`}
                  x2={`${line.x2}%`}
                  y2={`${line.y2}%`}
                  stroke="#34d399"
                  strokeWidth="8"
                  opacity="0.2"
                  className="blur-sm"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Burst particles */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {particles.map(p => {
            const rad = (p.angle * Math.PI) / 180;
            const targetX = Math.cos(rad) * p.speed;
            const targetY = Math.sin(rad) * p.speed;
            return (
              <div
                key={p.id}
                className="absolute w-2 h-2 rounded-full animate-ping pointer-events-none"
                style={{ 
                  left: `calc(${p.x}% + ${targetX}px)`, 
                  top: `calc(${p.y}% + ${targetY}px)`, 
                  backgroundColor: p.color,
                  boxShadow: `0 0 10px ${p.color}`,
                  transition: 'all 0.8s ease-out'
                }}
              />
            );
          })}
        </div>

        {/* Top bar instructions / dynamic status */}
        <div className="z-10 bg-slate-900/60 border border-slate-850 p-3 sm:p-4 rounded-2xl max-w-lg mx-auto w-full backdrop-blur-md mt-2 flex flex-col gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles size={14} className="text-purple-400 animate-pulse" />
              弱音のなぞり順：
            </span>
            <span className="font-bold text-slate-300">
              {currentIndex} / {words.length} 完了 (スコア: {score}pt)
            </span>
          </div>

          {/* Original text sequence visualizer */}
          <div className="flex flex-wrap gap-1.5 items-center justify-center p-2 rounded-xl bg-slate-950/70 border border-slate-850">
            {words.map((w, idx) => (
              <React.Fragment key={w.id}>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-lg font-bold transition-all",
                  w.status === 'cleared' ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 line-through decoration-emerald-500" :
                  w.status === 'active' ? "bg-purple-900/40 text-purple-300 border border-purple-500/60 scale-105 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.3)]" :
                  "bg-slate-900/50 text-slate-500 border border-slate-850"
                )}>
                  {w.original}
                </span>
                {idx < words.length - 1 && <ArrowRight size={10} className="text-slate-700" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Interactive Constellation Screen Area */}
        <div className="flex-1 relative min-h-[300px] z-10">
          
          {/* Affirmation Flash Notification Overlay */}
          {showAffirmation && (
            <div className="absolute top-8 inset-x-0 mx-auto max-w-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm px-4 py-2.5 rounded-2xl text-center shadow-[0_4px_15px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 border border-emerald-400/30 transition-all duration-300 transform scale-100 z-30 animate-bounce">
              <Smile size={16} />
              <span>{showAffirmation}</span>
            </div>
          )}

          {/* Render Constellation Node Stars */}
          {words.map((word) => {
            const isError = showErrorBubbleId === word.id;
            const isActive = word.status === 'active';
            const isCleared = word.status === 'cleared';

            return (
              <button
                key={word.id}
                onClick={() => handleWordClick(word)}
                style={{ left: `${word.x}%`, top: `${word.y}%` }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 px-4 py-3 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center",
                  "shadow-[0_4px_12px_rgba(0,0,0,0.5)] select-none max-w-[130px] sm:max-w-[180px] text-center",
                  isCleared 
                    ? "bg-gradient-to-r from-emerald-950/90 to-teal-950/90 text-emerald-300 border-2 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                    : isActive
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-2 border-purple-400 scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse"
                      : "bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:border-slate-600 border border-slate-800 hover:scale-105 active:scale-95",
                  isError ? "animate-shake border-red-500 text-red-400 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : ""
                )}
              >
                {isCleared ? (
                  <>
                    <span className="text-[9px] text-emerald-500 uppercase font-black tracking-widest flex items-center gap-0.5 mb-1">
                      <CheckCircle2 size={10} />
                      浄化済
                    </span>
                    <span className="line-through opacity-50 block text-[10px] truncate max-w-full mb-0.5">{word.original}</span>
                    <span className="text-[11px] font-black tracking-tight leading-tight block text-teal-200 mt-0.5">{word.purified}</span>
                  </>
                ) : (
                  <>
                    {isActive && (
                      <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest animate-pulse mb-1">
                        なぞって！
                      </span>
                    )}
                    <span className="text-xs sm:text-sm tracking-wide leading-tight break-words font-extrabold max-w-full">
                      {word.original}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Completion Screen Overlay */}
        {gameState === 'completed' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex flex-col justify-center items-center p-6 text-center transition-all duration-300">
            <div className="max-w-md w-full space-y-6">
              <div className="relative inline-block">
                <div className="p-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                  <Sparkles size={48} className="animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="absolute -top-1 -right-1 bg-purple-600 text-white p-1 px-2 rounded-full text-xs font-black shadow-md">
                  +10 Cheer
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400 uppercase">
                  浄化クエスト 成功！
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                  {post.userName || '名無し'} さんの弱音は美しく星空へと昇華されました。
                  すべての重荷が優しい言葉に変えられました。
                </p>
              </div>

              {/* Score Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 max-w-sm mx-auto shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-500">獲得スコア</span>
                  <span className="text-sm font-bold text-yellow-400">{score} pt</span>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-emerald-950/80 text-emerald-400 p-2.5 rounded-2xl border border-emerald-500/20">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400">タイムライン共感ボーナス</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      浄化が完了したため、{post.userName || '名無し'}さんの投稿に<b>共感 +10pt</b>が送信されました。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-xs mx-auto">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3 px-5 rounded-2xl font-bold border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  もう一度プレイ
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-5 rounded-2xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-xs transition-all shadow-lg cursor-pointer"
                >
                  クエストを閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styled custom CSS animation injected directly */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          20%, 60% { transform: translate(-52%, -50%) rotate(-3deg); }
          40%, 80% { transform: translate(-48%, -50%) rotate(3deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
