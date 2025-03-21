"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { WikiArticle } from '../types/wiki';
import { getArticleCountById } from '../firebase/wiki';
import { FiCalendar, FiUser, FiThumbsUp, FiCheckCircle, FiEdit2 } from "react-icons/fi";
import Link from "next/link";
import ShareButton from "./ShareButton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import WikiComments from './WikiComments';
import { addNotification } from "../firebase/notification";
import { incrementLikeCount, incrementUsefulCount } from "../firebase/wiki";

interface WikiArticleViewProps {
  article: WikiArticle;
  isAdmin?: boolean;
}

export default function WikiArticleView({ article, isAdmin = false }: WikiArticleViewProps) {
  const { user } = useAuth();
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [likeCount, setLikeCount] = useState(article.likeCount || 0);
  const [usefulCount, setUsefulCount] = useState(article.usefulCount || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasMarkedUseful, setHasMarkedUseful] = useState(false);
  const [isLoading, setIsLoading] = useState({ like: false, useful: false });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 日付のフォーマット
  useEffect(() => {
    const formatDate = () => {
      try {
        if (!article.date) return '日付なし';
        
        if (typeof article.date === 'string') {
          // ISO文字列の場合は日本語形式に変換
          try {
            return new Date(article.date).toLocaleDateString('ja-JP');
          } catch {
            return article.date;
          }
        }
        
        if (article.date instanceof Timestamp) {
          return article.date.toDate().toLocaleDateString('ja-JP');
        }
        
        if (article.date.seconds) {
          return new Date(article.date.seconds * 1000).toLocaleDateString('ja-JP');
        }
        
        return '日付なし';
      } catch (error) {
        console.error('日付フォーマットエラー:', error);
        return '日付なし';
      }
    };
    
    setFormattedDate(formatDate());
  }, [article.date]);

  // ユーザーのアクションステータスをローカルストレージから復元し、最新の評価データを取得
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const likedArticles = localStorage.getItem("likedArticles");
    const usefulArticles = localStorage.getItem("usefulArticles");
    
    if (likedArticles) {
      setHasLiked(likedArticles.split(",").includes(article.id || ""));
    }
    
    if (usefulArticles) {
      setHasMarkedUseful(usefulArticles.split(",").includes(article.id || ""));
    }

    // 最新のカウント情報を検索DB(searchDB)から取得
    const fetchLatestCounts = async () => {
      if (!article.id) return;
      
      try {
        const counts = await getArticleCountById(article.id);
        setLikeCount(counts.likeCount);
        setUsefulCount(counts.usefulCount);
      } catch (error) {
        console.error("カウント情報取得エラー:", error);
      }
    };
    
    fetchLatestCounts();
    
    // 30秒ごとに最新のカウントを取得
    const interval = setInterval(fetchLatestCounts, 3000000000);
    return () => clearInterval(interval);
  }, [article.id]);

  // いいね機能
  const handleLike = async () => {
    if (!article.id || hasLiked || isLoading.like) return;
    
    setIsLoading(prev => ({ ...prev, like: true }));
    
    try {
      // searchDBのみを更新
      await incrementLikeCount(article.id);
      
      // UI更新
      setLikeCount(prev => prev + 1);
      setHasLiked(true);
      
      // ローカルストレージに保存
      const likedArticles = localStorage.getItem("likedArticles") || "";
      localStorage.setItem(
        "likedArticles",
        likedArticles ? `${likedArticles},${article.id}` : article.id
      );

      // 記事著者に通知
      if (user && user.uid !== article.authorId) {
        addNotification({
          userId: article.authorId,
          type: "like",
          content: `${user.displayName || "ユーザー"} があなたの記事「${article.title}」にいいねしました。`,
          senderId: user.uid,
          articleId: article.id,
          date: new Date()
        }).catch(err => console.error("通知エラー:", err));
      }
      
      // 成功メッセージ
      setNotification({
        type: "success",
        message: "いいねしました！"
      });
      
      // 一定時間後に通知を消す
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("いいねエラー:", error);
      setNotification({
        type: "error",
        message: "いいねに失敗しました"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, like: false }));
    }
  };

  // 使えた！機能
  const handleUseful = async () => {
    if (!article.id || hasMarkedUseful || isLoading.useful) return;
    
    setIsLoading(prev => ({ ...prev, useful: true }));
    
    try {
      // searchDBのみを更新
      await incrementUsefulCount(article.id);
      
      // UI更新
      setUsefulCount(prev => prev + 1);
      setHasMarkedUseful(true);
      
      // ローカルストレージに保存
      const usefulArticles = localStorage.getItem("usefulArticles") || "";
      localStorage.setItem(
        "usefulArticles",
        usefulArticles ? `${usefulArticles},${article.id}` : article.id
      );
      
      // 記事著者に通知
      if (user && user.uid !== article.authorId) {
        addNotification({
          userId: article.authorId,
          type: "useful",
          content: `${user.displayName || "ユーザー"} があなたの記事「${article.title}」を「使えた！」と評価しました。`,
          senderId: user.uid,
          articleId: article.id,
          date: new Date()
        }).catch(err => console.error("通知エラー:", err));
      }
      
      // 成功メッセージ
      setNotification({
        type: "success",
        message: "「使えた！」としてマークしました！"
      });
      
      // 一定時間後に通知を消す
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("使えた！エラー:", error);
      setNotification({
        type: "error",
        message: "操作に失敗しました"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, useful: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* 記事コンテンツ */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            {/* 記事ヘッダー */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 text-gray-800">{article.title}</h1>
              <div className="text-gray-600 mb-4">{article.description}</div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <FiCalendar className="mr-1" />
                  <span>{formattedDate}</span>
                </div>
                <Link href={`/wiki/user?id=${article.authorId}`}>
                  <div className="flex items-center text-blue-600 hover:text-blue-800">
                    <FiUser className="mr-1" />
                    <span>{article.author}</span>
                  </div>
                </Link>
                <div className="flex items-center">
                  <FiThumbsUp className="mr-1" />
                  <span>いいね {likeCount}</span>
                </div>
                <div className="flex items-center">
                  <FiCheckCircle className="mr-1" />
                  <span>使えた！ {usefulCount}</span>
                </div>
                {isAdmin && (
                  <Link 
                    href={`/wiki/edit/${article.id}`}
                    className="ml-auto text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <FiEdit2 className="mr-1" />
                    <span>編集</span>
                  </Link>
                )}
                <div className="flex-grow"></div>
                <ShareButton title={article.title} />
              </div>
            </div>
            
            {/* アイキャッチ画像 */}
            {article.imageUrl && (
              <div className="w-full h-64 bg-gray-100 relative">
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            
            {/* マークダウンコンテンツ */}
            <div className="p-6 prose prose-lg max-w-none text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: {
                    node: any;
                    inline: any;
                    className?: string;
                    children: any;
                  }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({children, ...props}: {children: any; [key: string]: any}) {
                    const { href, ...rest } = props;
                    return (
                      <a 
                        href={href}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        {...rest}
                      >
                        {children}
                        {href && <span className="ml-1 text-xs">↗</span>}
                      </a>
                    );
                  }
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>
            
            {/* 記事評価フッター */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLike}
                  disabled={hasLiked || isLoading.like}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    hasLiked 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-white hover:bg-blue-50 border border-blue-200 text-blue-600'
                  }`}
                >
                  <FiThumbsUp />
                  <span>
                    {isLoading.like 
                      ? '処理中...' 
                      : hasLiked 
                        ? 'いいね済み' 
                        : 'いいね'
                    }
                  </span>
                  <span className="text-sm bg-blue-100 px-2 py-1 rounded-full">
                    {likeCount}
                  </span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUseful}
                  disabled={hasMarkedUseful || isLoading.useful}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    hasMarkedUseful 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-white hover:bg-green-50 border border-green-200 text-green-600'
                  }`}
                >
                  <FiCheckCircle />
                  <span>
                    {isLoading.useful 
                      ? '処理中...' 
                      : hasMarkedUseful 
                        ? '使えた！済み' 
                        : '使えた！'
                    }
                  </span>
                  <span className="text-sm bg-green-100 px-2 py-1 rounded-full">
                    {usefulCount}
                  </span>
                </motion.button>
              </div>
            </div>
            
            {/* 通知 */}
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`fixed bottom-8 right-8 z-50 px-6 py-3 rounded-lg shadow-lg ${
                  notification.type === 'success' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {notification.type === 'success' ? (
                    <span className="text-lg">✓</span>
                  ) : (
                    <span className="text-lg">!</span>
                  )}
                  <span>{notification.message}</span>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* コメントセクション */}
          <WikiComments 
            articleId={article.id || ''} 
            user={user}
            articleTitle={article.title}
            articleAuthorId={article.authorId}
          />
        </motion.div>
      </div>
    </div>
  );
}
