import React, { useState, useEffect } from 'react';
import { Post, PostConversion, Faction } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, increment, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFaction } from '../contexts/FactionContext';
import { CONVERSION_INSPIRATIONS } from '../lib/themes';
import { cn } from '../lib/utils';
import { Swords, Sparkles, Flame, Heart, SendHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PostConversionsProps {
  post: Post;
  postFaction: Faction;
  originalFaction?: Faction;
  onConversionsChange?: (conversions: PostConversion[]) => void;
}

export function PostConversions({ post, postFaction, originalFaction: propOriginalFaction, onConversionsChange }: PostConversionsProps) {
  const { isHeaven: isUserHeaven, isHellLeading, isHeavenDominant, hideHeavenPosts, hideHellPosts } = useFaction();
  const currentUser = auth.currentUser;

  const [conversions, setConversions] = useState<PostConversion[]>([]);
  // Open by default so opposing replies are immediately displayed under the post ("その返信を表示し")
  const [isOpen, setIsOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [converterName, setConverterName] = useState(() => {
    return localStorage.getItem('yowane_default_username') || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedConversions, setLikedConversions] = useState<Record<string, boolean>>({});

  const originalFaction: Faction = propOriginalFaction || post.originalFaction || post.faction || 'hell';
  const targetConvertFaction: Faction = originalFaction === 'heaven' ? 'hell' : 'heaven';

  // "非表示の設定にしている場合は返信も含めて完全に非表示になるようにしてください。"
  const visibleConversions = conversions.filter(c => {
    if (hideHeavenPosts && c.faction === 'heaven') return false;
    if (hideHellPosts && c.faction === 'hell') return false;
    return true;
  });

  const canShowConvertButton = !(hideHeavenPosts && targetConvertFaction === 'heaven') &&
                               !(hideHellPosts && targetConvertFaction === 'hell');

  useEffect(() => {
    const q = query(
      collection(db, 'posts', post.id, 'conversions'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: PostConversion[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as PostConversion);
      });
      setConversions(list);
      onConversionsChange?.(list);
    });

    return unsub;
  }, [post.id]);

  useEffect(() => {
    if (!currentUser || conversions.length === 0) return;

    let isMounted = true;
    const fetchReactions = async () => {
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        conversions.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, 'posts', post.id, 'conversions', c.id, 'reactions', currentUser.uid));
            if (snap.exists() && snap.data().like) {
              statuses[c.id] = true;
            }
          } catch (e) {
            // ignore
          }
        })
      );
      if (isMounted) {
        setLikedConversions(statuses);
      }
    };

    fetchReactions();
    return () => { isMounted = false; };
  }, [currentUser, conversions.length, post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      const convCol = collection(db, 'posts', post.id, 'conversions');
      const newConvRef = doc(convCol);

      batch.set(newConvRef, {
        postId: post.id,
        userId: currentUser.uid,
        userName: converterName.trim() || currentUser.displayName || '名無し',
        userPhoto: currentUser.photoURL || '',
        faction: targetConvertFaction,
        text: text.trim(),
        likeCount: 0,
        createdAt: serverTimestamp()
      });

      const postRef = doc(db, 'posts', post.id);
      batch.update(postRef, {
        conversionCount: increment(1),
        originalFaction: originalFaction
      });

      await batch.commit();

      setText('');
      setShowForm(false);
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to submit conversion', err);
      alert('変更の投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (conversionId: string, currentLikes: number) => {
    if (!currentUser) return;

    const alreadyLiked = !!likedConversions[conversionId];
    const change = alreadyLiked ? -1 : 1;

    try {
      const batch = writeBatch(db);
      const convRef = doc(db, 'posts', post.id, 'conversions', conversionId);
      const reactionRef = doc(db, 'posts', post.id, 'conversions', conversionId, 'reactions', currentUser.uid);

      batch.update(convRef, {
        likeCount: increment(change)
      });

      batch.set(reactionRef, {
        like: !alreadyLiked
      });

      // Calculate new total reply likes and determine battle winner
      const newConvLikes = Math.max(0, currentLikes + change);
      const newTotalReplyLikes = conversions.reduce((sum, c) => {
        if (c.id === conversionId) {
          return sum + newConvLikes;
        }
        return sum + (c.likeCount || 0);
      }, 0);

      const origLikes = post.likeCount || 0;
      const newWinningFaction: Faction = newTotalReplyLikes > origLikes ? targetConvertFaction : originalFaction;
      const newTotalScore = origLikes + newTotalReplyLikes;

      // Update parent post so all evaluations belong to the victorious faction
      const postRef = doc(db, 'posts', post.id);
      batch.update(postRef, {
        faction: newWinningFaction,
        winningFaction: newWinningFaction,
        originalFaction: originalFaction,
        replyLikeCount: newTotalReplyLikes,
        totalScore: newTotalScore
      });

      await batch.commit();

      setLikedConversions(prev => ({
        ...prev,
        [conversionId]: !alreadyLiked
      }));
    } catch (err) {
      console.error('Failed to toggle like on conversion', err);
    }
  };

  const inspirations = CONVERSION_INSPIRATIONS[targetConvertFaction];

  // If all conversions are hidden and convert button is also hidden, do not render
  if (visibleConversions.length === 0 && !canShowConvertButton) {
    return null;
  }

  return (
    <div className={cn(
      "mt-2 pt-2 border-t space-y-2.5",
      isHellLeading
        ? "border-zinc-900"
        : isUserHeaven && isHeavenDominant
        ? "border-amber-200/60"
        : "border-zinc-800/80"
    )}>
      {/* Conversion Bar: Toggle replies display + Button to change faction */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer",
            isHellLeading
              ? "text-zinc-400 hover:text-zinc-200"
              : isUserHeaven && isHeavenDominant
              ? "text-slate-600 hover:text-slate-900"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Swords size={13} className={targetConvertFaction === 'hell' ? 'text-rose-500' : 'text-amber-500'} />
          <span>返信・変更 ({visibleConversions.length})</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {canShowConvertButton && (
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              if (!isOpen) setIsOpen(true);
            }}
            className={cn(
              "text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs",
              targetConvertFaction === 'hell'
                ? "bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800"
                : "bg-amber-400 hover:bg-amber-300 text-amber-950"
            )}
          >
            {targetConvertFaction === 'hell' ? (
              <>
                <Flame size={12} className="text-rose-400" />
                <span>悪魔の文章に変更</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-amber-950" />
                <span>天使の文章に変更</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Inline Conversion Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className={cn(
          "p-3 rounded-xl border flex flex-col gap-2.5 transition-all",
          targetConvertFaction === 'hell'
            ? "bg-[#0b0c10] border-rose-900/60 text-zinc-200"
            : "bg-amber-50/70 border-amber-300 text-slate-800"
        )}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={targetConvertFaction === 'hell' ? 'text-rose-400' : 'text-amber-600'}>
              {targetConvertFaction === 'hell' ? '悪魔の文章に変更して返信' : '天使の文章に変更して返信'}
            </span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              閉じる
            </button>
          </div>

          {/* Quick inspirational chips */}
          <div className="flex flex-wrap gap-1">
            {inspirations.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText(item.template)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-md border transition-colors flex items-center gap-0.5 cursor-pointer font-medium",
                  targetConvertFaction === 'hell'
                    ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    : "bg-white hover:bg-amber-100 text-slate-700 border-amber-200"
                )}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="お名前 (任意)"
            value={converterName}
            onChange={e => setConverterName(e.target.value)}
            className={cn(
              "border rounded-lg px-2.5 py-1 text-xs outline-none font-medium max-w-[140px]",
              targetConvertFaction === 'hell'
                ? "bg-black/60 border-zinc-800 text-zinc-200 placeholder-zinc-500"
                : "bg-white border-amber-200 text-slate-800 placeholder-slate-400"
            )}
            maxLength={20}
          />

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={targetConvertFaction === 'hell' ? '悪魔風（弱音・本音）に変更して返信...' : '天使風（ポジティブ・励まし）に変更して返信...'}
            className={cn(
              "w-full rounded-lg p-2.5 text-xs focus:outline-none resize-none min-h-[65px] font-medium border",
              targetConvertFaction === 'hell'
                ? "bg-black/60 border-zinc-800 text-zinc-200 placeholder-zinc-500"
                : "bg-white border-amber-200 text-slate-800 placeholder-slate-400"
            )}
            maxLength={500}
            autoFocus
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] opacity-60">{text.length}/500</span>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className={cn(
                "px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer shadow-xs",
                targetConvertFaction === 'hell'
                  ? "bg-rose-700 hover:bg-rose-600 text-white"
                  : "bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold"
              )}
            >
              <SendHorizontal size={11} />
              <span>返信を投稿</span>
            </button>
          </div>
        </form>
      )}

      {/* Prominently displayed conversions / replies ("その返信を表示し") */}
      {isOpen && visibleConversions.length > 0 && (
        <div className="space-y-2 pt-0.5">
          {visibleConversions.map((conv) => {
            const isLiked = !!likedConversions[conv.id];
            const isHell = conv.faction === 'hell';

            return (
              <div
                key={conv.id}
                className={cn(
                  "p-3 rounded-xl border transition-all text-xs relative overflow-hidden",
                  isHell
                    ? "bg-[#10070c] border-rose-900/60 text-zinc-200 shadow-2xs"
                    : "bg-[#fffdfa] border-amber-300 text-stone-900 shadow-2xs"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded font-black text-[10px] border tracking-wide",
                      isHell
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : "bg-amber-200 text-amber-950 border-amber-400"
                    )}>
                      {isHell ? '悪魔の変更返信' : '天使の変更返信'}
                    </span>
                    <span className="font-extrabold text-xs">
                      {conv.userName || '名無し'}
                    </span>
                  </div>

                  <span className="text-[10px] opacity-60">
                    {conv.createdAt ? formatDistanceToNow(conv.createdAt.toDate(), { addSuffix: true, locale: ja }) : ''}
                  </span>
                </div>

                <p className="whitespace-pre-wrap leading-relaxed font-medium mb-2">
                  {conv.text}
                </p>

                {/* Evaluation button: Only "共感" (Empathy) button */}
                <div className="flex justify-end items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(conv.id, conv.likeCount || 0)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs",
                      isLiked
                        ? isHell
                          ? "bg-rose-700 text-white"
                          : "bg-amber-400 text-amber-950"
                        : isHell
                        ? "bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
                        : "bg-amber-50 text-stone-700 hover:text-stone-900 border border-amber-200"
                    )}
                    title="返信に共感"
                  >
                    <Heart size={12} className={isLiked ? "fill-current" : ""} />
                    <span>共感</span>
                    {(conv.likeCount || 0) > 0 && <span className="font-extrabold">{conv.likeCount}</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
