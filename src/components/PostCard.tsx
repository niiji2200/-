import React, { useState, useEffect } from 'react';
import { Post, Reaction, Faction, PostConversion } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, writeBatch, increment, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFaction } from '../contexts/FactionContext';
import { getWarThemePalette } from '../lib/colorGradation';
import { cn } from '../lib/utils';
import { Heart, Trophy, Trash2, User as UserIcon, Flower, Swords, ShieldCheck, Sparkles, Flame } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { PostConversions } from './PostConversions';

interface PostCardProps {
  key?: React.Key;
  post: Post;
  isRanking?: boolean;
}

export function PostCard({ post, isRanking }: PostCardProps) {
  const { isHeaven: isUserHeaven, isHellLeading, isHeavenDominant, effectiveHeavenPct } = useFaction();
  const palette = getWarThemePalette(effectiveHeavenPct);
  const [reaction, setReaction] = useState<Reaction>({ like: false, cheer: false });
  const [isLiking, setIsLiking] = useState(false);
  const [conversions, setConversions] = useState<PostConversion[]>([]);

  const currentUser = auth.currentUser;

  // The faction the post was originally created with
  const originalFaction: Faction = post.originalFaction || post.faction || 'hell';
  const targetConvertFaction: Faction = originalFaction === 'heaven' ? 'hell' : 'heaven';

  // Real-time scores calculation between original post and reply
  const originalScore = post.likeCount || 0;
  const replyScore = conversions.reduce((sum, c) => sum + (c.likeCount || 0), 0);
  const hasReplies = conversions.length > 0;

  // "元の投稿の評価と返信の評価数が大きい方の陣営を比べて、その後その投稿全ての評価は勝利した陣営の者となる"
  const winningFaction: Faction = (hasReplies && replyScore > originalScore)
    ? targetConvertFaction
    : originalFaction;

  const totalEvaluations = originalScore + replyScore;
  const isConquered = hasReplies && replyScore > originalScore;
  const isPostHeaven = winningFaction === 'heaven';

  useEffect(() => {
    if (!currentUser || post.isAwarded) return;
    const fetchReaction = async () => {
      const ref = doc(db, 'posts', post.id, 'reactions', currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setReaction(snap.data() as Reaction);
      }
    };
    fetchReaction();
  }, [currentUser, post.id, post.isAwarded]);

  // Sync winner and all evaluations to Firestore if local derivation differs
  useEffect(() => {
    if (post.isAwarded) return;
    if (hasReplies && (post.faction !== winningFaction || post.totalScore !== totalEvaluations)) {
      const postRef = doc(db, 'posts', post.id);
      updateDoc(postRef, {
        faction: winningFaction,
        winningFaction: winningFaction,
        originalFaction: originalFaction,
        replyLikeCount: replyScore,
        totalScore: totalEvaluations
      }).catch((e) => {
        // Non-blocking sync error
      });
    }
  }, [hasReplies, winningFaction, totalEvaluations, post.id, post.faction, post.totalScore, originalFaction, replyScore, post.isAwarded]);

  // "評価ボタンは共感のボタンだけで良い" -> Only like (共感) is supported
  const handleToggleLike = async () => {
    if (!currentUser || post.isAwarded || isLiking) return;

    setIsLiking(true);
    try {
      const batch = writeBatch(db);
      const postRef = doc(db, 'posts', post.id);
      const reactionRef = doc(db, 'posts', post.id, 'reactions', currentUser.uid);
      
      const currentlyHas = reaction.like;
      const change = currentlyHas ? -1 : 1;
      const newOriginalLikes = Math.max(0, originalScore + change);

      // Re-compare original evaluations vs reply evaluations to determine winner
      const newWinningFaction: Faction = (hasReplies && replyScore > newOriginalLikes)
        ? targetConvertFaction
        : originalFaction;
      const newTotalEvaluations = newOriginalLikes + replyScore;

      batch.update(postRef, {
        likeCount: increment(change),
        totalScore: newTotalEvaluations,
        faction: newWinningFaction,
        winningFaction: newWinningFaction,
        originalFaction: originalFaction,
        replyLikeCount: replyScore
      });

      batch.set(reactionRef, {
        like: !currentlyHas,
        cheer: false
      });

      await batch.commit();
      setReaction(prev => ({ ...prev, like: !currentlyHas }));
    } catch (err) {
      console.error('Failed to toggle like', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("削除しますか？")) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Awarded / Purified Post Card (Hall of fame)
  if (post.isAwarded) {
    return (
      <div className={cn(
        "rounded-2xl p-4 sm:p-5 border overflow-hidden relative transition-all",
        isPostHeaven
          ? "bg-gradient-to-br from-amber-50 via-white to-amber-100/80 border-amber-300 text-slate-800 shadow-sm"
          : "bg-gradient-to-br from-rose-50 via-white to-purple-50/80 border-rose-300 text-slate-800 shadow-sm"
      )}>
        <div className="absolute top-2 right-2 opacity-15 text-rose-500 pointer-events-none">
          <Flower size={56} />
        </div>

        <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-900">
              第{post.awardedRank}位 殿堂入り
            </span>
          </div>
          <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
            <Sparkles size={11} /> 浄化済み
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium relative z-10 mb-2">
          {post.text}
        </p>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold relative z-10 pt-2 border-t border-black/5">
          <span>{post.userName || '名無し'}</span>
          <span>{totalEvaluations} pt</span>
        </div>
      </div>
    );
  }

  // Active Standard Post Card with winning faction coloring
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5 border flex flex-col gap-3 relative transition-all duration-300 shadow-sm",
        isPostHeaven
          ? "bg-[#fffdf9] border-amber-300/85 ring-1 ring-amber-200/50 text-stone-900"
          : "bg-[#13090e] border-rose-900/60 ring-1 ring-rose-950 text-white"
      )}
    >
      {/* Header: User & Faction badge info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {post.userPhoto ? (
            <img
              src={post.userPhoto}
              alt="avatar"
              className={cn(
                "w-8 h-8 rounded-full object-cover ring-1 shrink-0",
                isPostHeaven ? "ring-amber-400/70" : "ring-rose-500/60"
              )}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-1",
                isPostHeaven
                  ? "bg-amber-100 text-amber-900 ring-amber-300"
                  : "bg-zinc-900 text-rose-400 ring-rose-900"
              )}
            >
              <UserIcon size={16} />
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              className={cn(
                "font-extrabold text-xs sm:text-sm truncate",
                isPostHeaven ? "text-stone-900" : "text-white"
              )}
            >
              {post.userName || '名無し'}
            </span>

            {/* Faction badge */}
            <span
              className={cn(
                "text-[10px] font-black px-1.5 py-0.5 rounded-md border shrink-0 tracking-wide",
                isPostHeaven
                  ? "bg-amber-200/90 text-amber-950 border-amber-400/80 shadow-2xs"
                  : "bg-rose-950 text-rose-200 border-rose-800 shadow-2xs"
              )}
            >
              {isConquered ? (
                <>
                  <span className="opacity-60">{originalFaction === 'heaven' ? '元:天使' : '元:悪魔'}</span>
                  <span className="mx-0.5">→</span>
                  <span className="font-black underline">{winningFaction === 'heaven' ? '天使' : '悪魔'}</span>
                </>
              ) : (
                isPostHeaven ? '天使' : '悪魔'
              )}
            </span>

            <span
              className={cn(
                "text-[11px] shrink-0 font-medium",
                isPostHeaven ? "text-stone-500" : "text-zinc-400"
              )}
            >
              {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ja }) : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 items-center shrink-0">
          {isRanking && (
            <div className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
              <Trophy size={12} />
              <span>{totalEvaluations}pt</span>
            </div>
          )}

          {currentUser && currentUser.uid === post.userId && (
            <button
              onClick={handleDelete}
              className={cn(
                "p-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer",
                isPostHeaven ? "text-stone-600 hover:text-red-600" : "text-zinc-400 hover:text-red-400"
              )}
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Battle Status: Short text as requested ("勝敗の表示は天使・悪魔がリードという短い文章を添えるのみでよく") */}
      {hasReplies && (
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full font-black text-xs border tracking-tight shadow-2xs inline-flex items-center gap-1",
              originalScore === replyScore
                ? "bg-zinc-900 text-zinc-300 border-zinc-700"
                : winningFaction === 'heaven'
                ? "bg-amber-100 text-amber-950 border-amber-400"
                : "bg-rose-950 text-rose-200 border-rose-800"
            )}
          >
            {originalScore === replyScore
              ? '互角'
              : winningFaction === 'heaven'
              ? '天使がリード'
              : '悪魔がリード'}
          </span>

          <span className="text-[11px] font-bold opacity-60">
            元: {originalScore} vs 返信: {replyScore}
          </span>
        </div>
      )}

      {/* User Custom Theme Tag if present */}
      {post.themeTitle && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span
            className={cn(
              "text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0",
              isPostHeaven
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-rose-950/80 text-rose-300 border-rose-800"
            )}
          >
            お題
          </span>
          <span
            className={cn(
              "truncate font-semibold",
              isPostHeaven ? "text-amber-950" : "text-rose-200"
            )}
          >
            {post.themeTitle}
          </span>
        </div>
      )}

      {/* Main post text */}
      <p
        className={cn(
          "whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm font-medium",
          isPostHeaven ? "text-stone-900" : "text-zinc-50"
        )}
      >
        {post.text}
      </p>

      {/* Actions: "評価ボタンは共感のボタンだけで良い" */}
      <div className="flex items-center gap-2 mt-0.5">
        {/* Only "共感" (Empathy) button */}
        <button
          onClick={handleToggleLike}
          disabled={isLiking}
          className={cn(
            "flex items-center gap-1 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs",
            reaction.like
              ? isPostHeaven
                ? "bg-amber-400 text-amber-950 shadow-2xs"
                : "bg-rose-700 text-white shadow-2xs"
              : isPostHeaven
              ? "bg-amber-50 hover:bg-amber-100/80 text-stone-800 border border-amber-200/80"
              : "bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800"
          )}
          title="元の投稿に共感"
        >
          <Heart size={13} className={reaction.like ? "fill-current" : ""} />
          <span>共感</span>
          {originalScore > 0 && <span className="font-extrabold">{originalScore}</span>}
        </button>

        {/* Total evaluation points belonging to the winning faction */}
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              isPostHeaven
                ? "bg-amber-100 text-amber-900"
                : "bg-rose-950 text-rose-300"
            )}
          >
            {winningFaction === 'heaven' ? '天使獲得' : '悪魔獲得'}
          </span>
          <span
            className={cn(
              "text-xs font-extrabold",
              isPostHeaven ? "text-amber-900" : "text-rose-300"
            )}
          >
            計 {totalEvaluations} pt
          </span>
        </div>
      </div>

      {/* Opposing faction conversion battle arena */}
      <PostConversions
        post={post}
        postFaction={winningFaction}
        originalFaction={originalFaction}
        onConversionsChange={setConversions}
      />
    </div>
  );
}
