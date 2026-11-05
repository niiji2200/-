import React, { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Post } from '../types';
import { useFaction } from '../contexts/FactionContext';
import { getFactionRankTitle } from '../lib/themes';
import { 
  Heart, 
  Trash2, 
  Download, 
  User as UserIcon, 
  Save, 
  Sparkles, 
  Swords, 
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface MyPageViewProps {
  user: any;
}

const SUPPORT_MESSAGES = [
  "今日もお疲れ様。生きてるだけで満点！",
  "周りのペースに合わせなくていいよ。",
  "完璧じゃなくていい。休んでもいいんだよ。",
  "がんばれない日は、息をしてるだけで十分！",
  "温かいものを飲んでゆっくり休んでね。"
];

export function MyPageView({ user }: MyPageViewProps) {
  const { faction: myFaction, isHeaven: isUserHeaven, isHellLeading, isHeavenDominant, openFactionModal } = useFaction();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultName, setDefaultName] = useState(() => {
    return localStorage.getItem('yowane_default_username') || '';
  });
  const [isSavingName, setIsSavingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [randomMessage, setRandomMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load user's posts
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const postsList: Post[] = [];
      snap.forEach((d) => {
        postsList.push({ id: d.id, ...d.data() } as Post);
      });
      
      postsList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setMyPosts(postsList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, 'list', 'posts');
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleGenerateMessage = () => {
    const randomIndex = Math.floor(Math.random() * SUPPORT_MESSAGES.length);
    setRandomMessage(SUPPORT_MESSAGES[randomIndex]);
  };

  const handleSaveDefaultName = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingName(true);
    localStorage.setItem('yowane_default_username', defaultName.trim());
    setTimeout(() => {
      setIsSavingName(false);
    }, 300);
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `posts/${id}`);
    }
  };

  const handleExportVents = () => {
    if (myPosts.length === 0) return;
    
    let textContent = "【投稿バックアップ】\n\n";
    textContent += `所属: ${myFaction === 'heaven' ? '天使' : '悪魔'}\n`;
    textContent += `作成日: ${new Date().toLocaleString()}\n`;
    textContent += `=========================================\n\n`;

    myPosts.forEach((post, idx) => {
      const dateStr = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : '';
      const fName = post.faction === 'heaven' ? '天使' : '悪魔';
      textContent += `[No.${myPosts.length - idx}] ${dateStr} [${fName}]\n`;
      textContent += `内容: ${post.text}\n`;
      textContent += `-----------------------------------------\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `posts_backup_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const totalPosts = myPosts.length;
    const totalScore = myPosts.reduce((acc, p) => acc + (p.totalScore || 0), 0);
    const totalLikes = myPosts.reduce((acc, p) => acc + (p.likeCount || 0), 0);
    const totalCheers = myPosts.reduce((acc, p) => acc + (p.cheerCount || 0), 0);
    const heavenPosts = myPosts.filter(p => p.faction === 'heaven').length;
    const hellPosts = myPosts.filter(p => (p.faction || 'hell') === 'hell').length;
    return { totalPosts, totalScore, totalLikes, totalCheers, heavenPosts, hellPosts };
  }, [myPosts]);

  const userRank = getFactionRankTitle(myFaction, stats.totalScore);

  const filteredMyPosts = useMemo(() => {
    if (!searchQuery.trim()) return myPosts;
    const q = searchQuery.toLowerCase();
    return myPosts.filter(p => 
      (p.text && p.text.toLowerCase().includes(q)) || 
      (p.userName && p.userName.toLowerCase().includes(q)) ||
      (p.themeTitle && p.themeTitle.toLowerCase().includes(q))
    );
  }, [myPosts, searchQuery]);

  return (
    <div className="space-y-3.5 pb-8">
      {/* Faction Profile Card */}
      <div className={cn(
        "rounded-2xl p-4 sm:p-5 border transition-all",
        isHellLeading
          ? "bg-black/95 border-rose-950/80 text-zinc-100 shadow-[0_4px_25px_rgba(0,0,0,0.9)]"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-300 shadow-2xs text-slate-800"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              isHellLeading
                ? "bg-zinc-950 border-zinc-800 text-rose-400"
                : isUserHeaven && isHeavenDominant
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-zinc-950 border-zinc-800 text-amber-400"
            )}>
              <UserIcon size={18} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base">{defaultName || '名無し'}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.2 rounded-md border",
                  isHellLeading ? "bg-zinc-900 border-zinc-800 text-zinc-300" : isUserHeaven && isHeavenDominant ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-300",
                  userRank.color
                )}>
                  {userRank.title}
                </span>
              </div>
              <div className="text-[11px] opacity-60">
                所属: {myFaction === 'heaven' ? '天使' : '悪魔'}
              </div>
            </div>
          </div>

          <button
            onClick={openFactionModal}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer",
              isHellLeading
                ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800"
                : isUserHeaven && isHeavenDominant
                ? "bg-amber-400 text-amber-950 hover:bg-amber-300 border-amber-400"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800"
            )}
          >
            <Swords size={12} />
            <span>陣営変更</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
          <div className="text-center">
            <div className="text-[10px] opacity-60 font-bold">スコア</div>
            <div className="text-base font-black text-amber-400">{stats.totalScore}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] opacity-60 font-bold">投稿</div>
            <div className="text-base font-black">{stats.totalPosts}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-rose-400 font-bold">共感</div>
            <div className="text-base font-black text-rose-400">{stats.totalLikes}</div>
          </div>
        </div>
      </div>

      {/* Username Setup Form */}
      <div className={cn(
        "rounded-2xl p-3 sm:p-4 border space-y-2 transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900 text-zinc-200"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-200 text-slate-800 shadow-2xs"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <div className="text-xs font-bold flex items-center gap-1">
          <UserIcon size={13} />
          お名前
        </div>
        <form onSubmit={handleSaveDefaultName} className="flex gap-2">
          <input
            type="text"
            value={defaultName}
            onChange={(e) => setDefaultName(e.target.value)}
            placeholder="投稿時のお名前"
            className={cn(
              "flex-1 border rounded-xl px-3 py-1 text-xs outline-none font-medium",
              isHellLeading
                ? "bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-600"
                : isUserHeaven && isHeavenDominant
                ? "bg-amber-50/50 border-amber-200 text-slate-800 placeholder-slate-400"
                : "bg-black/60 border-zinc-800 text-zinc-200 placeholder-zinc-500"
            )}
            maxLength={20}
          />
          <button
            type="submit"
            disabled={isSavingName}
            className={cn(
              "px-3.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs",
              isHellLeading
                ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                : isUserHeaven && isHeavenDominant
                ? "bg-amber-400 hover:bg-amber-300 text-amber-950"
                : "bg-zinc-800 hover:bg-zinc-700 text-white"
            )}
          >
            <Save size={12} />
            <span>保存</span>
          </button>
        </form>
      </div>

      {/* Message Generator */}
      <div className={cn(
        "rounded-2xl p-3 sm:p-4 border space-y-2 transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900 text-zinc-200"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-200 text-slate-800 shadow-2xs"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" />
            メッセージ
          </span>
          <button
            onClick={handleGenerateMessage}
            className="text-xs text-amber-400 hover:underline font-bold cursor-pointer"
          >
            引く
          </button>
        </div>

        {randomMessage ? (
          <div className="p-2.5 rounded-xl border text-xs font-bold bg-amber-500/10 border-amber-500/20 text-amber-400">
            &ldquo;{randomMessage}&rdquo;
          </div>
        ) : (
          <p className="text-[11px] opacity-50">
            ボタンを押すとメッセージが表示されます
          </p>
        )}
      </div>

      {/* My Post History List */}
      <div className={cn(
        "rounded-2xl p-3 sm:p-4 border space-y-2.5 transition-colors",
        isHellLeading
          ? "bg-black/90 border-zinc-900 text-zinc-200"
          : isUserHeaven && isHeavenDominant
          ? "bg-white/95 border-amber-200 text-slate-800 shadow-2xs"
          : "bg-[#111218] border-zinc-800 text-zinc-200"
      )}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold">投稿履歴</span>

          {myPosts.length > 0 && (
            <button
              onClick={handleExportVents}
              className="text-[11px] px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 cursor-pointer"
            >
              <Download size={11} />
              保存
            </button>
          )}
        </div>

        {/* Search */}
        {myPosts.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={12} />
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-7 pr-3 py-1 border rounded-lg text-xs outline-none font-medium",
                isHellLeading
                  ? "bg-zinc-950 border-zinc-900 text-zinc-200 placeholder-zinc-600"
                  : isUserHeaven && isHeavenDominant
                  ? "bg-amber-50/50 border-amber-200 text-slate-800 placeholder-slate-400"
                  : "bg-black/60 border-zinc-800 text-zinc-200 placeholder-zinc-500"
              )}
            />
          </div>
        )}

        {/* List */}
        <div className="space-y-2 pt-0.5">
          {loading ? (
            <div className="text-center py-4 text-xs opacity-50">読み込み中...</div>
          ) : filteredMyPosts.length === 0 ? (
            <div className="text-center py-4 text-xs opacity-50">
              投稿がありません
            </div>
          ) : (
            filteredMyPosts.map((post) => (
              <div
                key={post.id}
                className={cn(
                  "p-3 rounded-xl border space-y-1 text-xs",
                  isHellLeading
                    ? "bg-black/95 border-zinc-900 text-zinc-200"
                    : post.faction === 'heaven'
                    ? isUserHeaven && isHeavenDominant
                      ? "bg-amber-50/60 border-amber-200 text-slate-800"
                      : "bg-[#141520] border-amber-500/25 text-zinc-200"
                    : "bg-[#141520] border-rose-500/25 text-zinc-200"
                )}
              >
                <div className="flex items-center justify-between text-[10px] opacity-60">
                  <div className="flex items-center gap-1 font-bold">
                    <span>{post.faction === 'heaven' ? '天使' : '悪魔'}</span>
                    {post.themeTitle && <span>お題: {post.themeTitle}</span>}
                  </div>
                  <span>
                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ja }) : ''}
                  </span>
                </div>

                <p className="whitespace-pre-wrap leading-relaxed font-medium">
                  {post.text}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="font-bold opacity-75">
                    共感 {post.likeCount} ({post.totalScore}pt)
                  </span>

                  {confirmDeleteId === post.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-red-500">削除?</span>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-1.5 py-0.2 bg-red-600 text-white rounded text-[10px]"
                      >
                        はい
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded text-[10px]"
                      >
                        いいえ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(post.id)}
                      className="opacity-40 hover:opacity-100 hover:text-red-400 p-0.5 cursor-pointer"
                      title="削除"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
