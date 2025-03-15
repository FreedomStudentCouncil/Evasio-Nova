"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiThumbsUp, FiCheckCircle, FiBookmark, FiCalendar, FiMessageCircle, FiEdit } from "react-icons/fi";
import ReactMarkdown from 'react-markdown';
import Link from "next/link";
import Image from "next/image";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { incrementLikeCount, incrementUsefulCount, WikiArticle } from "../firebase/wiki";
import { useAuth } from "../context/AuthContext";

// 記事コンテンツ表示用のクライアントコンポーネント
interface WikiArticleContentProps { 
  articleId: string;
  initialData?: WikiArticle | null;
}

export default function WikiArticleContent({ 
  articleId, 
  initialData = null 
}: WikiArticleContentProps) {
  const [article, setArticle] = useState<WikiArticle | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchArticleData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "wikiArticles", articleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const articleData = { id: docSnap.id, ...docSnap.data() } as WikiArticle;
          setArticle(articleData);
          
          // 自分の記事かどうか確認
          if (user && articleData.authorId === user.uid) {
            setIsOwner(true);
          }
        } else {
          setArticle(null);
        }
      } catch (error) {
        console.error("記事の取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticleData();
  }, [articleId, user]);

  // 「使えた！」ボタンをクリックした時の処理
  const handleUsefulClick = async () => {
    if (isActionLoading || !article) return;
    
    setIsActionLoading(true);
    try {
      await incrementUsefulCount(articleId);
      // カウントを更新
      setArticle((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          usefulCount: prev.usefulCount + 1
        };
      });
    } catch (error) {
      console.error("「使えた！」の更新に失敗しました:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 「いいね」ボタンをクリックした時の処理
  const handleLikeClick = async () => {
    if (isActionLoading || !article) return;
    
    setIsActionLoading(true);
    try {
      await incrementLikeCount(articleId);
      // カウントを更新
      setArticle((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          likeCount: prev.likeCount + 1
        };
      });
    } catch (error) {
      console.error("「いいね」の更新に失敗しました:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl mb-4">記事が見つかりません</div>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
    >
      {/* ヘッダー部分 */}
      <div className="p-6 sm:p-8 border-b border-white/10">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">{article!.title}</h1>
          
          {isOwner && (
            <Link href={`/wiki/edit/${articleId}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                <FiEdit className="mr-1" /> 編集
              </motion.button>
            </Link>
          )}
        </div>
        
        <div className="flex flex-wrap items-center text-sm text-slate-300 gap-4 mb-6">
          <div className="flex items-center">
            <FiBookmark className="mr-1" /> {article.author}
          </div>
          <div className="flex items-center">
            <FiCalendar className="mr-1" /> {
              typeof article.date === 'string' 
                ? article.date 
                : article.date?.toDate().toLocaleDateString('ja-JP') || '日付なし'
            }
          </div>
          <div className="flex items-center text-green-400">
            <FiCheckCircle className="mr-1" /> 使えた！ {article.usefulCount}
          </div>
          <div className="flex items-center text-pink-400">
            <FiThumbsUp className="mr-1" /> いいね {article.likeCount}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {article.tags && article.tags.map((tag: string) => (
            <span 
              key={tag} 
              className="bg-white/10 text-xs rounded-full px-3 py-1"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* 記事本文 */}
      <div className="p-6 sm:p-8">
        {/* 記事に画像があれば表示 */}
        {article.imageUrl && (
          <div className="mb-6 relative w-full h-64">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              style={{objectFit: "cover"}}
              className="rounded-lg"
            />
          </div>
        )}
        
        {/* Markdownコンテンツ */}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>
            {article.content}
          </ReactMarkdown>
        </div>
        
        {/* アクションボタン */}
        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={handleUsefulClick}
            disabled={isActionLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isActionLoading ? 'opacity-70' : ''}`}
          >
            <FiCheckCircle className="mr-2" /> 使えた！
          </motion.button>
          
          <motion.button
            onClick={handleLikeClick}
            disabled={isActionLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isActionLoading ? 'opacity-70' : ''}`}
          >
            <FiThumbsUp className="mr-2" /> いいね
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/15 transition-all duration-300 flex items-center justify-center"
          >
            <FiMessageCircle className="mr-2" /> コメント
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
