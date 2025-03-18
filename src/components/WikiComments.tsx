"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  FiMessageCircle,
  FiCornerDownRight,
  FiSend,
  FiChevronDown,
  FiChevronUp,
  FiUser
} from "react-icons/fi";
import { 
  serverTimestamp,
} from "firebase/firestore";
import {
  WikiComment,
  getArticleComments,
  getCommentReplies,
  addComment
} from "../firebase/wiki";
import { User } from "firebase/auth";

interface WikiCommentsProps {
  articleId: string;
  user: User | null;
}

export default function WikiComments({ articleId, user }: WikiCommentsProps) {
  // コメント状態管理
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [lastComment, setLastComment] = useState<WikiComment | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [initialLoad, setInitialLoad] = useState(false);
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
      
      // 初回ロード完了フラグをセット
      if (!initialLoad) {
        setInitialLoad(true);
      }
    } catch (err) {
      console.error("コメントの取得に失敗しました:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [articleId, lastComment, loadingComments, hasMoreComments, initialLoad]);

  // コメント返信を読み込む
  const fetchReplies = async (commentId: string, reset: boolean = false) => {
    if (!commentId || replyLoading[commentId] || (!hasMoreReplies[commentId] && !reset)) return;
    
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
    if (articleId && !initialLoad) {
      fetchComments(true);
    }
  }, [articleId, fetchComments, initialLoad]);
  
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
      if (parentId && expandedComments.has(parentId)) {
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
    if (!commentId) return;
    
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
  
  // 日付フォーマットのヘルパー関数
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '日付なし';
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('ja-JP');
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('ja-JP');
    return '日付なし';
  };

  return (
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
        {!initialLoad ? (
          <div className="text-center py-8">
            <p className="text-gray-400">コメントを読み込み中...</p>
          </div>
        ) : comments.length === 0 ? (
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
                  
                  {/* コメントに返信がある場合のみ表示 */}
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
                    {replyLoading[comment.id] && (!commentReplies[comment.id] || commentReplies[comment.id]?.length === 0) ? (
                      <p className="text-sm text-center text-gray-400 py-2">返信を読み込み中...</p>
                    ) : commentReplies[comment.id]?.length === 0 ? (
                      <p className="text-sm text-center text-gray-400 py-2">返信がありません</p>
                    ) : (
                      <>
                        {commentReplies[comment.id]?.map((reply) => (
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
                              disabled={replyLoading[comment.id]}
                              className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center"
                            >
                              {replyLoading[comment.id] ? '読み込み中...' : 'さらに返信を読み込む'}
                              {!replyLoading[comment.id] && <FiChevronDown size={14} className="ml-1" />}
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
      
      {/* コメント末尾への参照（新規コメント追加時のスクロール用） */}
      <div ref={commentsEndRef} />
    </div>
  );
}
