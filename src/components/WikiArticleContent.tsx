"use client";
import { useState, useEffect } from "react";
// react-syntax-highlighterの型定義を追加
// @ts-ignore
import ReactMarkdown from "react-markdown";
// @ts-ignore
import remarkGfm from "remark-gfm";
// @ts-ignore
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-ignore
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiThumbsUp, FiCheckCircle, FiAlertCircle, FiExternalLink, FiCalendar, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { incrementLikeCount, incrementUsefulCount, getArticleCountById } from "../firebase/wiki";
import { addNotification } from "../firebase/notification";
// ShareButtonコンポーネントを追加
import ShareButton from "../components/ShareButton";
import { WikiArticle } from "../types/wiki";

// ShareButtonコンポーネントがない場合用の代替コンポーネント
// const ShareButton: React.FC<{ title: string }> = ({ title }) => {
//   return <button className="text-blue-400">共有</button>;
// };

interface WikiArticleContentProps {
  article: WikiArticle;
  createdAt: string;
}

export default function WikiArticleContent({ article, createdAt }: WikiArticleContentProps) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(article.likeCount || 0);
  const [usefulCount, setUsefulCount] = useState(article.usefulCount || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasMarkedUseful, setHasMarkedUseful] = useState(false);
  const [isLoading, setIsLoading] = useState({ like: false, useful: false });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ユーザーのアクションステータスをローカルストレージから復元
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
    const interval = setInterval(fetchLatestCounts, 30000);
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
          type: "like", // valid NotificationType
          content: `${user.displayName || "ユーザー"} があなたの記事「${article.title}」にいいねしました。`,
          senderId: user.uid, // fromUserIdをsenderIdに変更
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
          type: "useful", // valid NotificationType
          content: `${user.displayName || "ユーザー"} があなたの記事「${article.title}」を「使えた！」と評価しました。`,
          senderId: user.uid, // fromUserIdをsenderIdに変更
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
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      {/* 記事ヘッダー */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">{article.title}</h1>
        <div className="text-gray-600 mb-4">{article.description}</div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <FiCalendar className="mr-1" />
            <span>{createdAt}</span>
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
      <div className="p-6 prose prose-lg max-w-none">
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
              // hrefプロパティを明示的に抽出
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
                  {href && <FiExternalLink className="ml-1 text-xs" />}
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
              <FiCheckCircle className="text-lg" />
            ) : (
              <FiAlertCircle className="text-lg" />
            )}
            <span>{notification.message}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
