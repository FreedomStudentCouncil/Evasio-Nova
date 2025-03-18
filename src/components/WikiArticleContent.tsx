"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
  FiCheckCircle, 
  FiMessageCircle, 
  FiCornerDownRight,
  FiSend,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { 
  getArticleById, 
  incrementLikeCount, 
  incrementUsefulCount, 
  WikiArticle,
  WikiComment,
  getArticleComments,
  getCommentReplies,
  addComment
} from "../firebase/wiki";
import { useAuth } from "../context/AuthContext";
import { serverTimestamp } from "firebase/firestore";

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
  
  // コメント関連の状態
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [lastComment, setLastComment] = useState<WikiComment | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [activeReplyTo, setActiveReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentReplies, setCommentReplies] = useState<{[key: string]: WikiComment[]}>({});
  const [replyLoading, setReplyLoading] = useState<{[key: string]: boolean}>({});
  const [lastReplies, setLastReplies] = useState<{[key: string]: WikiComment | null}>({});
  const [hasMoreReplies, setHasMoreReplies] = useState<{[key: string]: boolean}>({});

  const commentsEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // コメントを読み込む
  const fetchComments = useCallback(async (reset: boolean = false) => {
    if (!articleId || loadingComments || (!hasMoreComments && !reset)) return;
    
    setLoadingComments(true);
    try {
      const commentsData = await getArticleComments(
        articleId, 
        reset ? null : lastComment
      );
      
      // 新しいコメントで初期化するかリストに追加
      setComments(prev => reset ? commentsData : [...prev, ...commentsData]);
      
      // 次のページがあるかチェック
      setHasMoreComments(commentsData.length === 10); // 10件表示の場合
      
      // 最後のコメントを保存
      if (commentsData.length > 0) {
        setLastComment(commentsData[commentsData.length - 1]);
      }
    } catch (err) {
      console.error("コメントの取得に失敗しました:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [articleId, lastComment, loadingComments, hasMoreComments]);

  // コメント返信を読み込む
  const fetchReplies = async (commentId: string, reset: boolean = false) => {
    if (replyLoading[commentId] || (!hasMoreReplies[commentId] && !reset)) return;
    
    setReplyLoading(prev => ({ ...prev, [commentId]: true }));
    try {
      const repliesData = await getCommentReplies(
        commentId,
        reset ? null : lastReplies[commentId] || null
      );
      
      // 新しい返信で初期化するかリストに追加
      setCommentReplies(prev => ({
        ...prev,
        [commentId]: reset ? repliesData : [...(prev[commentId] || []), ...repliesData]
      }));
      
      // 次のページがあるかチェック
      setHasMoreReplies(prev => ({
        ...prev,
        [commentId]: repliesData.length === 5 // 5件表示の場合
      }));
      
      // 最後の返信を保存
      if (repliesData.length > 0) {
        setLastReplies(prev => ({
          ...prev,
          [commentId]: repliesData[repliesData.length - 1]
        }));
      }
    } catch (err) {
      console.error("返信の取得に失敗しました:", err);
    } finally {
      setReplyLoading(prev => ({ ...prev, [commentId]: false }));
    }
  };
  
  // 初回読み込み時にコメントを取得
  useEffect(() => {
    if (articleId && !loading && article) {
      fetchComments(true);
    }
  }, [articleId, loading, article, fetchComments]);
  
  // コメントを追加
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleId || submittingComment || !commentText.trim()) return;
    
    setSubmittingComment(true);
    setCommentError(null);
    
    try {
      await addComment({
        articleId,
        content: commentText.trim(),
        author: user?.displayName || "匿名ユーザー",
        authorId: user?.uid || null,
        // serverTimestamp()を使用
        date: serverTimestamp(),
        parentId: null
      });
      
      // コメント入力をクリアして最新のコメントを再取得
      setCommentText("");
      fetchComments(true);
      
    } catch (err) {
      console.error("コメントの追加に失敗しました:", err);
      setCommentError("コメントの投稿に失敗しました。再試行してください。");
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // 返信を追加
  const handleAddReply = async (parentId: string) => {
    if (!articleId || submittingComment || !replyText.trim() || !parentId) return;
    
    setSubmittingComment(true);
    
    try {
      await addComment({
        articleId,
        content: replyText.trim(),
        author: user?.displayName || "匿名ユーザー",
        authorId: user?.uid || null,
        // serverTimestamp()を使用
        date: serverTimestamp(),
        parentId
      });
      
      // 返信入力をクリアして返信を展開、再取得
      setReplyText("");
      setActiveReplyTo(null);
      
      // コメントの返信カウント表示を更新
      setComments(prev => prev.map(comment => 
        comment.id === parentId ? 
        { ...comment, replyCount: (comment.replyCount || 0) + 1 } : 
        comment
      ));
      
      // 既に展開している場合は返信を再取得
      if (expandedComments.has(parentId)) {
        fetchReplies(parentId, true);
      }
      
    } catch (err) {
      console.error("返信の追加に失敗しました:", err);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // コメントの展開/折りたたみを切り替え
  const toggleComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      // 初回展開時に返信を取得
      if (!commentReplies[commentId]) {
        fetchReplies(commentId, true);
      }
    }
    
    setExpandedComments(newExpanded);
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
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('ja-JP');
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
        
        {/* コメントセクション */}
        <div className="mt-12 pt-6 border-t border-white/10">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <FiMessageCircle className="mr-2" /> コメント
          </h2>
          
          {/* コメント投稿フォーム */}
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex flex-col gap-3">
              <textarea
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50"
                rows={3}
                placeholder="コメントを入力..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={submittingComment}
              />
              
              {commentError && (
                <p className="text-red-400 text-sm">{commentError}</p>
              )}
              
              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={submittingComment || !commentText.trim()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    submittingComment || !commentText.trim()
                      ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                  }`}
                >
                  <FiSend size={16} />
                  <span>投稿する</span>
                </motion.button>
              </div>
            </div>
          </form>
          
          {/* コメント一覧 */}
          <div className="space-y-6">
            {comments.length === 0 && !loadingComments ? (
              <p className="text-center text-gray-400 py-8">まだコメントはありません。最初のコメントを投稿しましょう！</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                    {/* コメントヘッダー */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="bg-indigo-600/30 rounded-full p-2 mr-3">
                          <FiUser size={18} />
                        </div>
                        <div>
                          <div className="font-medium">{comment.author || "匿名ユーザー"}</div>
                          <div className="text-xs text-gray-400">{formatDate(comment.date)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* コメント本文 */}
                    <div className="ml-10 mb-3">
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    
                    {/* コメントアクション */}
                    <div className="ml-10 flex justify-between items-center">
                      <button
                        onClick={() => comment.id && setActiveReplyTo(activeReplyTo === comment.id ? null : comment.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                      >
                        <FiCornerDownRight size={14} className="mr-1" />
                        返信する
                      </button>
                      
                      {/* コメントに返信がある場合のみ表示 - nullチェックを追加 */}
                      {comment.id && comment.replyCount && comment.replyCount > 0 ? (
                        <button
                          onClick={() => comment.id && toggleComment(comment.id)}
                          className="text-gray-400 hover:text-white text-sm flex items-center"
                        >
                          {comment.id && expandedComments.has(comment.id) ? (
                            <>
                              <span>返信を閉じる</span>
                              <FiChevronUp size={16} className="ml-1" />
                            </>
                          ) : (
                            <>
                              <span>{`${comment.replyCount}件の返信を表示`}</span>
                              <FiChevronDown size={16} className="ml-1" />
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                    
                    {/* 返信フォーム */}
                    {activeReplyTo === comment.id && (
                      <div className="ml-10 mt-4 bg-white/5 rounded-lg p-3">
                        <textarea
                          className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white placeholder-white/50 text-sm"
                          rows={2}
                          placeholder="返信を入力..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          disabled={submittingComment}
                        />
                        
                        <div className="flex justify-end mt-2">
                          <motion.button
                            onClick={() => comment.id && handleAddReply(comment.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={submittingComment || !replyText.trim() || !comment.id}
                            className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                              submittingComment || !replyText.trim()
                                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                            }`}
                          >
                            <FiSend size={12} />
                            <span>返信</span>
                          </motion.button>
                        </div>
                      </div>
                    )}
                    
                    {/* 返信一覧 */}
                    {comment.id && expandedComments.has(comment.id) && (
                      <div className="ml-10 mt-3 space-y-3">
                        {comment.id && replyLoading[comment.id] && !commentReplies[comment.id] ? (
                          <p className="text-sm text-center text-gray-400 py-2">返信を読み込み中...</p>
                        ) : comment.id && commentReplies[comment.id]?.length === 0 ? (
                          <p className="text-sm text-center text-gray-400 py-2">返信がありません</p>
                        ) : (
                          <>
                            {comment.id && commentReplies[comment.id]?.map((reply) => (
                              <div key={reply.id} className="bg-white/5 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <div className="bg-indigo-600/30 rounded-full p-1.5 mr-2">
                                      <FiUser size={14} />
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{reply.author || "匿名ユーザー"}</div>
                                      <div className="text-xs text-gray-400">{formatDate(reply.date)}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="ml-8">
                                  <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                            
                            {/* さらに返信を読み込むボタン */}
                            {comment.id && hasMoreReplies[comment.id] && (
                              <div className="text-center pt-1">
                                <button
                                  onClick={() => comment.id && fetchReplies(comment.id)}
                                  disabled={comment.id ? replyLoading[comment.id] : true}
                                  className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center"
                                >
                                  {comment.id && replyLoading[comment.id] ? '読み込み中...' : 'さらに返信を読み込む'}
                                  {comment.id && !replyLoading[comment.id] && <FiChevronDown size={14} className="ml-1" />}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* コメントをもっと読み込むボタン */}
                {hasMoreComments && (
                  <div className="text-center pt-4 pb-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchComments()}
                      disabled={loadingComments}
                      className="px-6 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                      {loadingComments ? 'コメントを読み込み中...' : 'さらにコメントを読み込む'}
                      {!loadingComments && <FiChevronDown size={18} />}
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* コメント読み込み中 */}
          {loadingComments && comments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">コメントを読み込み中...</p>
            </div>
          )}
          
          {/* コメント末尾への参照（新規コメント追加時のスクロール用） */}
          <div ref={commentsEndRef} />
        </div>
      </div>
    </motion.div>
  );
}
