"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { updateUsername } from "../firebase/user";
import { resetPassword } from "../firebase/auth"; // sendPasswordReset から resetPassword に変更
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiUser, FiCalendar, FiCheckCircle, FiThumbsUp, FiAlertTriangle, FiCamera, FiEdit2, FiAlertCircle } from "react-icons/fi";
import { getUserArticles, WikiArticle } from "../firebase/wiki";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { updateProfileImage } from "../firebase/user";
import { resendVerificationEmail } from "../firebase/auth";

export default function UserProfilePageClient() {
  const { user, isEmailVerified } = useAuth();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("ユーザー");
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isOwnProfile = user?.uid === userId;
  
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        // ユーザー情報の取得
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUsername(userData.displayName || "匿名ユーザー");
          setNewUsername(userData.displayName || "");
          setUserEmail(userData.email || "");
          setProfileImage(userData.profileImage || null);
        }
        
        // ユーザーの記事一覧を取得
        const userArticles = await getUserArticles(userId);
        setArticles(userArticles);
      } catch (error) {
        console.error("ユーザーデータ取得エラー:", error);
        if (error instanceof Error && error.toString().includes('requires an index')) {
          setError("データベースのインデックスが必要です。管理者にお問い合わせください。");
        } else {
          setError("データの取得中にエラーが発生しました。");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await updateProfileImage(userId, file);
      // 画像を再読み込み
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setProfileImage(userSnap.data().profileImage);
      }
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      setError("画像のアップロードに失敗しました。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      setUpdateError("ユーザー名を入力してください");
      return;
    }
    
    try {
      setUpdateError(null);
      await updateUsername(userId, username, newUsername.trim());
      setUsername(newUsername.trim());
      setIsEditing(false);
      setUpdateSuccess("ユーザー名を更新しました");
    } catch (error) {
      if (error instanceof Error && error.toString().includes('already in use')) {
        setUpdateError("このユーザー名は既に使用されています");
      } else {
        setUpdateError("更新中にエラーが発生しました");
      }
    }
  };

  const handlePasswordReset = async () => {
    try {
      setUpdateError(null);
      await resetPassword(userEmail); // sendPasswordReset から resetPassword に変更
      setUpdateSuccess("パスワードリセットメールを送信しました");
    } catch (error) {
      setUpdateError("パスワードリセットメールの送信に失敗しました");
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await resendVerificationEmail(user);
      setUpdateSuccess("確認メールを再送信しました。メールボックスをご確認ください。");
    } catch (error) {
      setUpdateError("確認メールの再送信に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  // IDがない場合のUI
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center max-w-lg">
          <h2 className="text-xl font-bold text-amber-400 mb-2">ユーザーIDが指定されていません</h2>
          <p className="text-white">適切なユーザーIDをクエリパラメータとして指定してください。</p>
          <p className="text-gray-400 mt-4">例: /wiki/user?id=user-123</p>
        </div>
      </div>
    );
  }

  // 認証待ちユーザー用の UI
  if (isOwnProfile && !isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center"
            >
              <FiAlertCircle className="mx-auto text-4xl text-yellow-400 mb-4" />
              <h1 className="text-2xl font-bold mb-4">メールアドレス認証を待っています</h1>
              <p className="text-slate-300 mb-6">
                {user?.email} 宛に確認メールを送信しました。<br />
                メールボックスをご確認いただき、認証を完了してください。
              </p>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="animate-pulse text-slate-400">処理中...</div>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg transition-colors"
                  >
                    確認メールを再送信
                  </button>
                )}

                <div>
                  <Link href="/wiki">
                    <button className="text-slate-300 hover:text-white transition-colors">
                      Wiki一覧に戻る
                    </button>
                  </Link>
                </div>
              </div>

              {updateSuccess && (
                <div className="mt-4 text-green-400 text-sm">{updateSuccess}</div>
              )}
              {updateError && (
                <div className="mt-4 text-red-400 text-sm">{updateError}</div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // プロフィール編集ボタンの表示条件を変更
  const canEdit = isOwnProfile && isEmailVerified;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/wiki">
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8"
            >
              <FiArrowLeft className="mr-2" /> Wiki一覧に戻る
            </motion.button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden mb-8"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="text-3xl" />
                    )}
                  </div>
                  {isOwnProfile && (
                    <label className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5 cursor-pointer hover:bg-blue-600 transition-colors">
                      <FiCamera className="text-sm" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  {isEditing && isOwnProfile ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-white/10 rounded px-2 py-1 text-white"
                        placeholder="新しいユーザー名"
                      />
                      <button
                        onClick={handleUsernameUpdate}
                        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-bold">{username}</h1>
                      {isOwnProfile && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                      )}
                    </div>
                  )}
                  {isOwnProfile && (
                    <button
                      onClick={handlePasswordReset}
                      className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                    >
                      パスワードを再設定
                    </button>
                  )}
                </div>
              </div>
              {updateError && (
                <div className="mt-4 text-red-400 text-sm">{updateError}</div>
              )}
              {updateSuccess && (
                <div className="mt-4 text-green-400 text-sm">{updateSuccess}</div>
              )}
              {isOwnProfile && !isEmailVerified && (
                <div className="mt-4 bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    プロフィールを編集するには、メールアドレスの認証が必要です。
                    メールボックスを確認して、認証を完了してください。
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <h2 className="text-xl font-semibold mb-6">投稿記事一覧</h2>
          
          {error ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
              <FiAlertTriangle className="mx-auto text-3xl mb-3" />
              <p>{error}</p>
            </div>
          ) : articles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  <Link href={`/wiki/view?id=${article.id}`}>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-colors"
                    >
                      <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                      <p className="text-slate-300 text-sm mb-4 line-clamp-2">{article.description}</p>
                      
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {article.tags.map(tag => (
                            <span key={tag} className="text-xs bg-white/10 rounded-full px-2 py-1">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm text-slate-300">
                        <div className="flex items-center">
                          <FiCalendar className="mr-1" /> 
                          {typeof article.date === 'string' 
                            ? article.date 
                            : article.date?.toDate().toLocaleDateString('ja-JP') || '日付なし'}
                        </div>
                      </div>
                      
                      <div className="flex justify-between mt-4 text-sm">
                        <span className="flex items-center text-green-400">
                          <FiCheckCircle className="mr-1" />
                          使えた！ {article.usefulCount}
                        </span>
                        <span className="flex items-center text-pink-400">
                          <FiThumbsUp className="mr-1" />
                          いいね {article.likeCount}
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-white/5 rounded-xl">
              <p className="text-slate-300">このユーザーはまだ記事を投稿していません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}