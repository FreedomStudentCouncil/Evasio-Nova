"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  FiEdit, 
  FiUser, 
  FiCalendar, 
  FiTag, 
  FiThumbsUp, 
  FiCheckCircle
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  getArticleById, 
  incrementLikeCount, 
  incrementUsefulCount, 
  WikiArticle
} from "../firebase/wiki";
import { useAuth } from "../context/AuthContext";
import WikiComments from "./WikiComments";
import { getUserProfile } from "../firebase/user";

// IDを受け取らないように変更
export default function WikiArticleContent() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id") || "";
  
  const { user } = useAuth();
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedByUser, setLikedByUser] = useState(false);
  const [usefulMarkedByUser, setUsefulMarkedByUser] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<{ profileImage?: string | null } | null>(null);
  
  // ユーザーの評価状態を確認
  useEffect(() => {
    if (user && articleId) {
      const likedArticles = JSON.parse(localStorage.getItem(`liked_articles_${user.uid}`) || '[]');
      const usefulArticles = JSON.parse(localStorage.getItem(`useful_articles_${user.uid}`) || '[]');
      
      setLikedByUser(likedArticles.includes(articleId));
      setUsefulMarkedByUser(usefulArticles.includes(articleId));
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
        const articleData = await getArticleById(articleId);
        if (!articleData) {
          setError("記事が見つかりませんでした");
        } else {
          setArticle(articleData);
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
      setArticle(prev => prev ? {
        ...prev,
        likeCount: (prev.likeCount || 0) + 1
      } : null);
      
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
      setArticle(prev => prev ? {
        ...prev,
        usefulCount: (prev.usefulCount || 0) + 1
      } : null);
      
    } catch (err) {
      console.error("役に立ったの追加に失敗しました:", err);
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
      {/* 記事ヘッダー */}
      <div className="p-6 lg:p-8">
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
            {user && article.authorId === user.uid && (
              <Link href={`/wiki/edit?id=${article.id}`}>
                {/* buttonタグにtype属性を追加 */}
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
            {/* 「使えた！」ボタンにtype属性を追加 */}
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
                  {article.usefulCount || 0}
                </span>
              </motion.div>
            </button>
            
            {/* 「いいね」ボタンにtype属性を追加 */}
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
                  {article.likeCount || 0}
                </span>
              </motion.div>
            </button>
          </div>
        </div>
        
        {/* コメントセクション - 新しいコンポーネントで置き換え */}
        <WikiComments articleId={articleId} user={user} />
      </div>
    </motion.div>
  );
}
