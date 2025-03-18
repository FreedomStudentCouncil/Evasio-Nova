"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FiEdit, FiUser, FiCalendar, FiTag, FiThumbsUp, FiCheckCircle } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { getArticleById, incrementLikeCount, incrementUsefulCount, WikiArticle } from "../firebase/wiki";
import { useAuth } from "../context/AuthContext";

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
  
  // いいねを追加
  const handleLike = async () => {
    if (!user || likedByUser || !articleId) return;
    
    try {
      await incrementLikeCount(articleId);
      
      // ローカルストレージに保存して二重評価を防止
      const likedArticles = JSON.parse(localStorage.getItem(`liked_articles_${user.uid}`) || '[]');
      likedArticles.push(articleId);
      localStorage.setItem(`liked_articles_${user.uid}`, JSON.stringify(likedArticles));
      
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
    if (!user || usefulMarkedByUser || !articleId) return;
    
    try {
      await incrementUsefulCount(articleId);
      
      // ローカルストレージに保存して二重評価を防止
      const usefulArticles = JSON.parse(localStorage.getItem(`useful_articles_${user.uid}`) || '[]');
      usefulArticles.push(articleId);
      localStorage.setItem(`useful_articles_${user.uid}`, JSON.stringify(usefulArticles));
      
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

  // 日付フォーマットのヘルパー関数
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '日付なし';
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('ja-JP');
    return '日付なし';
  };

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
              <FiUser className="mr-1" />
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center text-blue-400 bg-blue-500/20 hover:bg-blue-500/30 transition-colors px-4 py-2 rounded-lg"
                >
                  <FiEdit className="mr-2" /> 編集
                </motion.button>
              </Link>
            )}
          </div>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUseful}
              disabled={usefulMarkedByUser || !user}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                usefulMarkedByUser
                  ? 'bg-green-500/40 text-green-300 cursor-default'
                  : user
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiCheckCircle />
              <span>使えた！</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">
                {article.usefulCount || 0}
              </span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              disabled={likedByUser || !user}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                likedByUser
                  ? 'bg-pink-500/40 text-pink-300 cursor-default'
                  : user
                  ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiThumbsUp />
              <span>いいね</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-sm">
                {article.likeCount || 0}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
