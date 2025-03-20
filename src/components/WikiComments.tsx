"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiMessageCircle,
  FiCornerDownRight,
  FiSend,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiThumbsUp
} from "react-icons/fi";
import { 
  serverTimestamp,
} from "firebase/firestore";
import {
  WikiComment,
  WikiReply,
  getArticleComments,
  getCommentReplies,
  addComment,
  addReply,
  incrementCommentLikeCount,
  incrementReplyLikeCount
} from "../firebase/wiki";
import { User } from "firebase/auth";
import { getUserProfile } from "../firebase/user";
import { addNotification } from "../firebase/notification";

interface WikiCommentsProps {
  articleId: string;
  user: User | null;
  articleTitle: string;  // 記事のタイトルを追加
  articleAuthorId: string;  // 記事の著者IDを追加
}

export default function WikiComments({ articleId, user, articleTitle, articleAuthorId }: WikiCommentsProps) {
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
  // いいね済みコメントを記録する状態
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [userProfiles, setUserProfiles] = useState<{[key: string]: { profileImage?: string | null }}>({});

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ユーザーのいいね状態を確認
  useEffect(() => {
    if (user) {
      const likedCommentIds = JSON.parse(localStorage.getItem(`liked_comments_${user.uid}`) || '[]');
      setLikedComments(new Set(likedCommentIds));
    }
  }, [user]);

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
    if (!articleId || !commentId || replyLoading[commentId] || (!hasMoreReplies[commentId] && !reset)) return;
    
    setReplyLoading(prev => ({ ...prev, [commentId]: true }));
    try {
      const repliesData = await getCommentReplies(
        articleId,
        commentId,
        reset ? null : (lastReplies[commentId] as WikiReply | null)
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
      const commentId = await addComment(
        articleId,
        {
          content: commentText.trim(),
          author: user?.displayName || "匿名ユーザー",
          authorId: user?.uid || null,
          date: serverTimestamp(),
        }
      );
      
      // 記事の著者に通知を送信（自分の記事へのコメントは通知しない）
      if (user && articleAuthorId && user.uid !== articleAuthorId) {
        await addNotification({
          userId: articleAuthorId,
          type: 'comment',
          articleId,
          articleTitle,
          senderId: user.uid,
          senderName: user.displayName || "匿名ユーザー",
          content: commentText.trim()
        });
      }
      
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
      // 親コメント情報を取得して、コメント投稿者IDを特定
      const parentComment = comments.find(comment => comment.id === parentId);
      const parentCommentAuthorId = parentComment?.authorId;

      const replyId = await addReply(
        articleId,
        parentId,
        {
          content: replyText.trim(),
          author: user?.displayName || "匿名ユーザー",
          authorId: user?.uid || null,
          date: serverTimestamp()
        }
      );

      // 1. 記事の著者に通知を送信（自分の記事への返信は通知しない）
      if (user && articleAuthorId && user.uid !== articleAuthorId) {
        await addNotification({
          userId: articleAuthorId,
          type: 'reply',
          articleId,
          articleTitle,
          senderId: user.uid,
          senderName: user.displayName || "匿名ユーザー",
          content: replyText.trim()
        });
      }
      
      // 2. 親コメントの投稿者にも通知（自分のコメントへの返信は通知しない）
      if (user && parentCommentAuthorId && 
          user.uid !== parentCommentAuthorId && 
          parentCommentAuthorId !== articleAuthorId) { // 記事著者でない場合のみ（重複通知防止）
        await addNotification({
          userId: parentCommentAuthorId,
          type: 'reply',
          articleId,
          articleTitle,
          senderId: user.uid,
          senderName: user.displayName || "匿名ユーザー",
          content: replyText.trim()
        });
      }
      
      setReplyText("");
      
      setComments(prev => prev.map(comment => 
        comment.id === parentId ? 
        { ...comment, replyCount: (comment.replyCount || 0) + 1 } : 
        comment
      ));
      
      if (parentId && expandedComments.has(parentId)) {
        fetchReplies(parentId, true);
      } else {
        toggleComment(parentId);
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
  
  // コメントにいいねを追加
  const handleLikeComment = async (commentId: string) => {
    if (!articleId || !commentId || !user || likedComments.has(commentId)) return;
    
    try {
      await incrementCommentLikeCount(articleId, commentId);
      
      // いいねされたコメントの情報を取得
      const likedComment = comments.find(c => c.id === commentId);
      
      // コメント投稿者に通知を送信（自分のコメントへのいいねは通知しない）
      if (user && likedComment?.authorId && user.uid !== likedComment.authorId) {
        await addNotification({
          userId: likedComment.authorId,
          type: 'like',
          articleId,
          articleTitle,
          senderId: user.uid,
          senderName: user.displayName || "匿名ユーザー",
          content: `${likedComment.content.slice(0, 30)}${likedComment.content.length > 30 ? '...' : ''}`
        });
      }
      
      // ローカルストレージに保存して二重いいねを防止
      const updatedLikedComments = Array.from(likedComments);
      updatedLikedComments.push(commentId);
      localStorage.setItem(`liked_comments_${user.uid}`, JSON.stringify(updatedLikedComments));
      setLikedComments(new Set(updatedLikedComments));
      
      // コメントのいいねカウント表示を更新 (親コメントとリプライ両方)
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? 
        { ...comment, likeCount: (comment.likeCount || 0) + 1 } : 
        comment
      ));
      
      // 返信コメントのいいねカウントも更新
      setCommentReplies(prev => {
        const newReplies = { ...prev };
        Object.keys(newReplies).forEach(parentId => {
          newReplies[parentId] = newReplies[parentId].map(reply => 
            reply.id === commentId ? 
            { ...reply, likeCount: (reply.likeCount || 0) + 1 } : 
            reply
          );
        });
        return newReplies;
      });
    } catch (err) {
      console.error("コメントへのいいね追加に失敗しました:", err);
    }
  };

  // 返信にいいねを追加
  const handleLikeReply = async (commentId: string, replyId: string) => {
    if (!articleId || !commentId || !replyId || !user || likedComments.has(replyId)) return;
    
    try {
      await incrementReplyLikeCount(articleId, commentId, replyId);
      
      // いいねされた返信の情報を取得
      const replies = commentReplies[commentId] || [];
      const likedReply = replies.find(r => r.id === replyId);
      
      // 返信投稿者に通知を送信（自分の返信へのいいねは通知しない）
      if (user && likedReply?.authorId && user.uid !== likedReply.authorId) {
        await addNotification({
          userId: likedReply.authorId,
          type: 'like',
          articleId,
          articleTitle,
          senderId: user.uid,
          senderName: user.displayName || "匿名ユーザー",
          content: `${likedReply.content.slice(0, 30)}${likedReply.content.length > 30 ? '...' : ''}`
        });
      }
      
      // ローカルストレージに保存して二重いいねを防止
      const updatedLikedComments = Array.from(likedComments);
      updatedLikedComments.push(replyId);
      localStorage.setItem(`liked_comments_${user.uid}`, JSON.stringify(updatedLikedComments));
      setLikedComments(new Set(updatedLikedComments));
      
      // 返信コメントのいいねカウントを更新
      setCommentReplies(prev => {
        const newReplies = { ...prev };
        if (newReplies[commentId]) {
          newReplies[commentId] = newReplies[commentId].map(reply =>
            reply.id === replyId ? 
            { ...reply, likeCount: (reply.likeCount || 0) + 1 } : 
            reply
          );
        }
        return newReplies;
      });
    } catch (err) {
      console.error("返信へのいいね追加に失敗しました:", err);
    }
  };
  
  // Boolean型に変換するヘルパー関数を追加
  const toBool = (value: any): boolean => !!value;

  // 日付フォーマットのヘルパー関数
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '日付なし';
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('ja-JP');
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('ja-JP');
    return '日付なし';
  };

  // ユーザープロフィールを取得する関数
  const fetchUserProfile = async (userId: string) => {
    if (!userId || userProfiles[userId]) return;
    
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfiles(prev => ({
          ...prev,
          [userId]: profile
        }));
      }
    } catch (error) {
      console.error("ユーザープロフィールの取得に失敗:", error);
    }
  };

  // コメントと返信のユーザープロフィールを取得
  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = new Set<string>();
      
      // コメントのユーザーIDを収集
      comments.forEach(comment => {
        if (comment.authorId) userIds.add(comment.authorId);
      });
      
      // 返信のユーザーIDを収集
      Object.values(commentReplies).forEach(replies => {
        replies.forEach(reply => {
          if (reply.authorId) userIds.add(reply.authorId);
        });
      });
      
      // 各ユーザーのプロフィールを取得
      for (const userId of userIds) {
        await fetchUserProfile(userId);
      }
    };
    
    fetchProfiles();
  }, [comments, commentReplies]);

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
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                submittingComment || !commentText.trim()
                  ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
              }`}
            >
              <motion.div
                whileHover={!submittingComment && commentText.trim() ? { scale: 1.05 } : {}}
                whileTap={!submittingComment && commentText.trim() ? { scale: 0.95 } : {}}
                className="flex items-center gap-2"
              >
                <FiSend size={16} />
                <span>投稿する</span>
              </motion.div>
            </button>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden mr-3">
                      {comment.authorId && userProfiles[comment.authorId]?.profileImage ? (
                        <img
                          src={userProfiles[comment.authorId].profileImage || ""}
                          alt={comment.author || "ユーザー"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiUser size={18} />
                      )}
                    </div>
                    <div>
                      {comment.authorId ? (
                        <Link href={`/wiki/user?id=${comment.authorId}`}>
                          <div className="font-medium hover:text-blue-300 transition-colors">
                            {comment.author || "匿名ユーザー"}
                          </div>
                        </Link>
                      ) : (
                        <div className="font-medium">{comment.author || "匿名ユーザー"}</div>
                      )}
                      <div className="text-xs text-gray-400">{formatDate(comment.date)}</div>
                    </div>
                  </div>
                  
                  {/* いいねボタン */}
                  <button
                    type="button"
                    onClick={() => comment.id && handleLikeComment(comment.id)}
                    disabled={toBool(!user || (comment.id && likedComments.has(comment.id)))}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
                      !user
                        ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                        : comment.id && likedComments.has(comment.id)
                        ? 'bg-pink-500/40 text-pink-300 cursor-default'
                        : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300'
                    }`}
                  >
                    <FiThumbsUp size={12} />
                    <span>{comment.likeCount || 0}</span>
                  </button>
                </div>
                
                {/* コメント本文 */}
                <div className="ml-10 mb-3">
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </div>
                
                {/* コメントアクション */}
                <div className="ml-10 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => comment.id && setActiveReplyTo(activeReplyTo === comment.id ? null : comment.id)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                  >
                    <FiCornerDownRight size={14} className="mr-1" />
                    返信する
                  </button>
                  
                  {/* コメントに返信がある場合のみ表示 */}
                  {comment.id && comment.replyCount && comment.replyCount > 0 ? (
                    <button
                      type="button"
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
                      <button
                        type="button"
                        onClick={() => comment.id && handleAddReply(comment.id)}
                        disabled={toBool(submittingComment || !replyText.trim() || !comment.id)}
                        className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                          submittingComment || !replyText.trim()
                            ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                        }`}
                      >
                        <motion.div
                          whileHover={!submittingComment && replyText.trim() && comment.id ? { scale: 1.05 } : {}}
                          whileTap={!submittingComment && replyText.trim() && comment.id ? { scale: 0.95 } : {}}
                          className="flex items-center gap-2"
                        >
                          <FiSend size={12} />
                          <span>返信</span>
                        </motion.div>
                      </button>
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
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden mr-2">
                                  {reply.authorId && userProfiles[reply.authorId]?.profileImage ? (
                                    <img
                                      src={userProfiles[reply.authorId].profileImage || ""}
                                      alt={reply.author || "ユーザー"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <FiUser size={14} />
                                  )}
                                </div>
                                <div>
                                  {reply.authorId ? (
                                    <Link href={`/wiki/user?id=${reply.authorId}`}>
                                      <div className="text-sm font-medium hover:text-blue-300 transition-colors">
                                        {reply.author || "匿名ユーザー"}
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="text-sm font-medium">
                                      {reply.author || "匿名ユーザー"}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400">{formatDate(reply.date)}</div>
                                </div>
                              </div>
                              
                              {/* 返信へのいいねボタン */}
                              <button
                                type="button"
                                onClick={() => reply.id && comment.id && handleLikeReply(comment.id, reply.id)}
                                disabled={toBool(!user || (reply.id && likedComments.has(reply.id)))}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
                                  !user
                                    ? 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                                    : reply.id && likedComments.has(reply.id)
                                    ? 'bg-pink-500/40 text-pink-300 cursor-default'
                                    : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300'
                                }`}
                              >
                                <FiThumbsUp size={12} />
                                <span>{reply.likeCount || 0}</span>
                              </button>
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
                              type="button"
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
                <button
                  type="button"
                  onClick={() => fetchComments()}
                  disabled={loadingComments}
                  className="px-6 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <motion.div
                    whileHover={!loadingComments ? { scale: 1.05 } : {}}
                    whileTap={!loadingComments ? { scale: 0.95 } : {}}
                    className="flex items-center gap-2"
                  >
                    {loadingComments ? 'コメントを読み込み中...' : 'さらにコメントを読み込む'}
                    {!loadingComments && <FiChevronDown size={18} />}
                  </motion.div>
                </button>
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
