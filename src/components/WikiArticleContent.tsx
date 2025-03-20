"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  FiEdit, 
  FiUser, 
  FiCalendar, 
  FiTag, 
  FiThumbsUp, 
  FiCheckCircle,
  FiThumbsDown, // 低評価アイコン
  FiTrash2, // 削除アイコン
  FiAlertTriangle // 警告アイコン
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  getArticleById, 
  incrementLikeCount, 
  incrementUsefulCount, 
  incrementDislikeCount, // 新しい関数
  deleteArticle, // 記事削除関数
  WikiArticle,
  getArticleCountById
} from "../firebase/wiki";
import { useAuth } from "../context/AuthContext";
import WikiComments from "./WikiComments";
import { getUserProfile } from "../firebase/user";
import { cacheManager } from "../utils/cacheManager"; 

// IDを受け取らないように変更
export default function WikiArticleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const articleId = searchParams.get("id") || "";
  
  const { user, isAdmin } = useAuth(); // isAdminを追加
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedByUser, setLikedByUser] = useState(false);
  const [usefulMarkedByUser, setUsefulMarkedByUser] = useState(false);
  const [dislikedByUser, setDislikedByUser] = useState(false); // 低評価状態
  const [authorProfile, setAuthorProfile] = useState<{ profileImage?: string | null } | null>(null);
  const [counts, setCounts] = useState<{ likeCount: number; usefulCount: number; dislikeCount?: number }>({ 
    likeCount: 0, 
    usefulCount: 0,
    dislikeCount: 0
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 削除確認ダイアログ表示状態
  
  // ユーザーの評価状態を確認
  useEffect(() => {
    if (user && articleId) {
      const likedArticles = JSON.parse(localStorage.getItem(`liked_articles_${user.uid}`) || '[]');
      const usefulArticles = JSON.parse(localStorage.getItem(`useful_articles_${user.uid}`) || '[]');
      const dislikedArticles = JSON.parse(localStorage.getItem(`disliked_articles_${user.uid}`) || '[]');
      
      setLikedByUser(likedArticles.includes(articleId));
      setUsefulMarkedByUser(usefulArticles.includes(articleId));
      setDislikedByUser(dislikedArticles.includes(articleId));
    }
  }, [user, articleId]);
  
  // 記事データを取得
  useEffect(() => {
    const fetchArticleData = async () => {
      if (!articleId) {
        setLoading(false);
        return;
      }
      
      try {
        // 記事本体を取得
        const articleData = await getArticleById(articleId);
        if (!articleData) {
          setError("記事が見つかりませんでした");
        } else {
          setArticle(articleData);
          
          // 必ず最新のカウント情報を取得（キャッシュを使わない）
          const latestCounts = await getArticleCountById(articleId);
          setCounts(latestCounts);
          
          // 記事を開いたら、IndexedDBのキャッシュも更新
          await cacheManager.updateArticleCount(
            articleId,
            latestCounts.likeCount,
            latestCounts.usefulCount
          );
        }
      } catch (err) {
        console.error("記事の取得に失敗しました:", err);
        setError("記事の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticleData();
  }, [articleId]);
  
  // 著者のプロフィール情報を取得
  useEffect(() => {
    const fetchAuthorProfile = async () => {
      if (article?.authorId) {
        try {
          const profile = await getUserProfile(article.authorId);
          setAuthorProfile(profile);
        } catch (error) {
          console.error("著者プロフィールの取得に失敗:", error);
        }
      }
    };
    fetchAuthorProfile();
  }, [article?.authorId]);
  
  // いいねを追加
  const handleLike = async () => {
    if (likedByUser || !articleId) return;
    
    try {
      await incrementLikeCount(articleId);
      
      // ローカルストレージに保存して二重評価を防止
      const storageKey = user ? `liked_articles_${user.uid}` : 'liked_articles_anonymous';
      const likedArticles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      likedArticles.push(articleId);
      localStorage.setItem(storageKey, JSON.stringify(likedArticles));
      
      // 状態を更新
      setLikedByUser(true);
      setCounts(prev => ({
        ...prev,
        likeCount: prev.likeCount + 1
      }));
      
      // この記事のキャッシュも即時更新
      const newLikeCount = counts.likeCount + 1;
      await cacheManager.updateArticleCount(
        articleId,
        newLikeCount,
        counts.usefulCount
      );
      
    } catch (err) {
      console.error("いいねの追加に失敗しました:", err);
    }
  };
  
  // 役に立ったを追加
  const handleUseful = async () => {
    if (usefulMarkedByUser || !articleId) return;
    
    try {
      await incrementUsefulCount(articleId);
      
      // ローカルストレージに保存して二重評価を防止
      const storageKey = user ? `useful_articles_${user.uid}` : 'useful_articles_anonymous';
      const usefulArticles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      usefulArticles.push(articleId);
      localStorage.setItem(storageKey, JSON.stringify(usefulArticles));
      
      // 状態を更新
      setUsefulMarkedByUser(true);
      setCounts(prev => ({
        ...prev,
        usefulCount: prev.usefulCount + 1
      }));
      
      // この記事のキャッシュも即時更新
      const newUsefulCount = counts.usefulCount + 1;
      await cacheManager.updateArticleCount(
        articleId,
        counts.likeCount,
        newUsefulCount
      );
      
    } catch (err) {
      console.error("役に立ったの追加に失敗しました:", err);
    }
  };
  
  // 低評価を追加（管理者のみ）
  const handleDislike = async () => {
    if (dislikedByUser || !articleId || !isAdmin) return;
    
    try {
      // isAdmin値を渡して管理者チェックを行う
      await incrementDislikeCount(articleId, isAdmin);
      
      // ローカルストレージに保存して二重評価を防止
      const storageKey = user ? `disliked_articles_${user.uid}` : 'disliked_articles_anonymous';
      const dislikedArticles = JSON.parse(localStorage.getItem(storageKey) || '[]');
      dislikedArticles.push(articleId);
      localStorage.setItem(storageKey, JSON.stringify(dislikedArticles));
      
      // 状態を更新
      setDislikedByUser(true);
      setCounts(prev => ({
        ...prev,
        dislikeCount: (prev.dislikeCount || 0) + 1
      }));
      
    } catch (err) {
      console.error("低評価の追加に失敗しました:", err);
    }
  };
  
  // 記事を削除する処理
  const handleDeleteArticle = async () => {
    if (!articleId || (!isAdmin && (!user || article?.authorId !== user.uid))) return;
    
    try {
      setLoading(true);
      await deleteArticle(articleId);
      router.push("/wiki"); // 削除後はWiki一覧に戻る
    } catch (error) {
      console.error("記事の削除に失敗しました:", error);
      setError("記事の削除に失敗しました");
      setLoading(false);
    }
  };
  
  // 日付フォーマットのヘルパー関数
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '日付なし';
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('ja-JP');
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('ja-JP');
    return '日付なし';
  };
  
  // IDがない場合
  if (!articleId) {
    return (
      <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2">記事IDが指定されていません</h2>
        <p className="text-white">適切な記事IDをクエリパラメータとして指定してください。</p>
        <p className="text-gray-400 mt-4">例: /wiki/view?id=article-123</p>
      </div>
    );
  }
  
  // 読み込み中
  if (loading) {
    return <div className="text-center py-12">記事を読み込み中...</div>;
  }
  
  // エラー
  if (error || !article) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">エラー</h2>
        <p className="text-white">{error || "記事の取得に失敗しました"}</p>
        <Link href="/wiki">
          <div className="mt-4 inline-block px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            Wiki一覧に戻る
          </div>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
    >
      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4 text-red-400">記事を削除しますか？</h3>
            <p className="mb-6 text-slate-300">
              この操作は取り消せません。記事「{article.title}」を本当に削除しますか？
            </p>
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                キャンセル
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDeleteArticle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
              >
                削除する
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 記事ヘッダー */}
      <div className="p-6 lg:p-8">
        {/* 管理者バッジ */}
        {isAdmin && (
          <div className="mb-4 bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center">
              <FiAlertTriangle className="text-amber-400 mr-2" />
              <span className="text-amber-300">管理者モード - このセクションは管理者にのみ表示されます</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/wiki/edit?id=${article.id}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-500/30 text-blue-300 hover:bg-blue-500/40 rounded-lg px-3 py-1 flex items-center"
                >
                  <FiEdit className="mr-1" /> 編集
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500/30 text-red-300 hover:bg-red-500/40 rounded-lg px-3 py-1 flex items-center"
              >
                <FiTrash2 className="mr-1" /> 削除
              </motion.button>
            </div>
          </div>
        )}
        
        <h1 className="text-2xl lg:text-3xl font-bold mb-3">{article.title}</h1>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {article.tags && article.tags.map(tag => (
            <Link href={`/wiki?tag=${tag}`} key={tag}>
              <span className="bg-blue-500/20 text-blue-300 text-sm rounded-full px-3 py-1 flex items-center hover:bg-blue-500/30 transition-colors">
                <FiTag className="mr-1" size={14} />
                {tag}
              </span>
            </Link>
          ))}
        </div>
        
        <div className="flex flex-wrap justify-between items-center text-sm text-slate-300 mb-6 gap-y-2">
          <Link href={`/wiki/user?id=${article.authorId}`}>
            <div className="flex items-center hover:text-white transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden mr-2">
                {authorProfile?.profileImage ? (
                  <img
                    src={authorProfile.profileImage}
                    alt={article.author || "ユーザー"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser className="text-lg" />
                )}
              </div>
              <span>{article.author || "不明なユーザー"}</span>
            </div>
          </Link>
          
          <div className="flex items-center">
            <FiCalendar className="mr-1" />
            <span>
              {formatDate(article.lastUpdated || article.date)}
            </span>
          </div>
        </div>
        
        {/* 記事画像がある場合 */}
        {article.imageUrl && (
          <div className="relative w-full h-64 md:h-80 mb-6 rounded-lg overflow-hidden">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
            />
          </div>
        )}

        {/* 記事内容 */}
        <div className="prose prose-invert prose-slate max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw]}
          >
            {article.content}
          </ReactMarkdown>
        </div>
        
        {/* 記事フッター */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap justify-between gap-4">
          <div className="flex items-center">
            {(user && article.authorId === user.uid) && (
              <Link href={`/wiki/edit?id=${article.id}`}>
                <button
                  type="button"
                  className="flex items-center text-blue-400 bg-blue-500/20 hover:bg-blue-500/30 transition-colors px-4 py-2 rounded-lg"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center"
                  >
                    <FiEdit className="mr-2" /> 編集
                  </motion.div>
                </button>
              </Link>
            )}
          </div>
          
          <div className="flex gap-3">
            {/* 管理者用低評価ボタン */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleDislike}
                disabled={dislikedByUser}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  dislikedByUser 
                    ? 'bg-gray-500/40 text-gray-300 cursor-default' 
                    : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
                }`}
              >
                <motion.div
                  whileHover={!dislikedByUser ? { scale: 1.05 } : {}}
                  whileTap={!dislikedByUser ? { scale: 0.95 } : {}}
                  className="flex items-center gap-2"
                >
                  <FiThumbsDown />
                  <span>低評価</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">
                    {counts.dislikeCount || 0}
                  </span>
                </motion.div>
              </button>
            )}
            
            {/* 「使えた！」ボタン */}
            <button
              type="button"
              onClick={handleUseful}
              disabled={usefulMarkedByUser}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                usefulMarkedByUser
                  ? 'bg-green-500/40 text-green-300 cursor-default'
                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
              }`}
            >
              <motion.div
                whileHover={!usefulMarkedByUser && user ? { scale: 1.05 } : {}}
                whileTap={!usefulMarkedByUser && user ? { scale: 0.95 } : {}}
                className="flex items-center gap-2"
              >
                <FiCheckCircle />
                <span>使えた！</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">
                  {counts.usefulCount || 0}
                </span>
              </motion.div>
            </button>
            
            {/* 「いいね」ボタン */}
            <button
              type="button"
              onClick={handleLike}
              disabled={likedByUser}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                likedByUser
                  ? 'bg-pink-500/40 text-pink-300 cursor-default'
                  : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400'
              }`}
            >
              <motion.div
                whileHover={!likedByUser && user ? { scale: 1.05 } : {}}
                whileTap={!likedByUser && user ? { scale: 0.95 } : {}}
                className="flex items-center gap-2"
              >
                <FiThumbsUp />
                <span>いいね</span>
                <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">
                  {counts.likeCount || 0}
                </span>
              </motion.div>
            </button>
          </div>
        </div>
        
        {/* コメントセクション */}
        <WikiComments articleId={articleId} user={user} />
      </div>
    </motion.div>
  );
}
