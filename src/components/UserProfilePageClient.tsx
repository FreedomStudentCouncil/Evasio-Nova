"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { updateUsername, updateUserBio, updateUserBadge, isAdminEmail } from "../firebase/user";
import { resetPassword } from "../firebase/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowLeft, FiUser, FiCalendar, FiCheckCircle, FiThumbsUp, 
  FiAlertTriangle, FiCamera, FiEdit2, FiAlertCircle, FiAward,
  FiTrendingUp, FiSave, FiX, FiInfo, FiPlus
} from "react-icons/fi";
import { getUserArticles, WikiArticle, getAuthorCountById } from "../firebase/wiki";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { updateProfileImage } from "../firebase/user";
import { resendVerificationEmail } from "../firebase/auth";
import { 
  Trophy, 
  Badge, 
  calculateUserTrophies, 
  allBadges,
  allTrophies,
  getAvailableBadges 
} from "../utils/trophies";
import useTrophyTracker from "../hooks/useTrophyTracker";
import { sendBadgeNotification, sendTrophyNotification } from "../firebase/notification";

export default function UserProfilePageClient() {
  const { user, isEmailVerified } = useAuth();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("ユーザー");
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newBio, setNewBio] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    likeCount: 0,
    usefulCount: 0,
    articleCount: 0,
    averageScore: 0,
    totalScore: 0
  });
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const badgeSelectorRef = useRef<HTMLDivElement>(null);
  
  const isOwnProfile = user?.uid === userId;

  // トロフィートラッカーフックの呼び出しを条件付きではなく常に呼び出す
  // パラメータの方で実行を制御する
  const { earnedTrophies, availableBadges, newTrophies, clearNewTrophies } = useTrophyTracker({
    userId,
    userStats,
    isAdmin,
    isActive: isOwnProfile // 自分のプロフィールページでのみ有効
  });
  
  // 外部クリック検出のための効果
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (badgeSelectorRef.current && !badgeSelectorRef.current.contains(event.target as Node)) {
        setShowBadgeSelector(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
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
          setSelectedBadge(userData.selectedBadge || null);
          setUserBio(userData.bio || "");
          setNewBio(userData.bio || "");
          
          // 管理者チェック - 明示的に管理者メールアドレスを確認
          if (userData.email) {
            const isAdminUser = userData.email === "egnm9stasshe@gmail.com";
            setIsAdmin(isAdminUser);
            console.log("管理者チェック:", userData.email, isAdminUser);
          }
        }
        
        // ユーザーの記事一覧を取得
        const userArticles = await getUserArticles(userId);
        setArticles(userArticles);
        
        // ユーザーの統計情報を取得
        const authorStats = await getAuthorCountById(userId);
        
        const stats = {
          likeCount: authorStats.likeCount || 0,
          usefulCount: authorStats.usefulCount || 0,
          articleCount: userArticles.length,
          averageScore: authorStats.averageScore || 0,
          totalScore: authorStats.articleScoreSum || 0
        };
        
        setUserStats(stats);
        
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
    
    if (userId) {
      fetchUserData();
    }
  }, [userId, user?.uid]);
  
  // useEffect内でトロフィー獲得通知を処理
  useEffect(() => {
    // 新しく獲得したトロフィーがある場合、通知を送信
    if (isOwnProfile && newTrophies.length > 0) {
      const sendNotifications = async () => {
        try {
          // 各トロフィーについて通知を送信
          for (const trophy of newTrophies) {
            await sendTrophyNotification(userId, trophy.id, trophy.title);
            console.log(`トロフィー獲得通知を送信: ${trophy.title}`);
          }
          // 新しいトロフィーをクリア
          clearNewTrophies();
        } catch (error) {
          console.error('トロフィー通知の送信に失敗:', error);
        }
      };
      
      sendNotifications();
    }
  }, [newTrophies, userId, isOwnProfile, clearNewTrophies]);

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
  
  const handleBioUpdate = async () => {
    try {
      setUpdateError(null);
      await updateUserBio(userId, newBio);
      setUserBio(newBio);
      setIsEditingBio(false);
      setUpdateSuccess("自己紹介を更新しました");
    } catch (error) {
      setUpdateError("自己紹介の更新に失敗しました");
    }
  };
  
  const handleBadgeSelect = async (badgeId: string | null) => {
    try {
      setUpdateError(null);
      await updateUserBadge(userId, badgeId);
      setSelectedBadge(badgeId);
      setShowBadgeSelector(false);
      setUpdateSuccess("バッジを更新しました");
      
      // 新しいバッジを選択した場合に通知を送信
      if (badgeId && badgeId !== selectedBadge) {
        const badge = allBadges.find(b => b.id === badgeId);
        if (badge) {
          await sendBadgeNotification(userId, badgeId, badge.name);
        }
      }
    } catch (error) {
      setUpdateError("バッジの更新に失敗しました");
    }
  };

  const handlePasswordReset = async () => {
    try {
      setUpdateError(null);
      await resetPassword(userEmail);
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
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="text-3xl" />
                    )}
                    
                    {/* バッジ表示 - React-Iconsを使用、クリック可能に */}
                    {selectedBadge && (
                      <div 
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-800/90 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white/60 transition-all"
                        onClick={() => isOwnProfile && setShowBadgeSelector(true)}
                      >
                        {(() => {
                          const badge = allBadges.find(b => b.id === selectedBadge);
                          if (badge) {
                            const BadgeIcon = badge.icon;
                            return <BadgeIcon className={`${badge.color} text-lg`} />;
                          }
                          return <FiAward className="text-yellow-500 text-lg" />;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* 画像アップロードボタン - 左下に配置 */}
                  {isOwnProfile && (
                    <label className="absolute -bottom-2 -left-2 bg-blue-500 rounded-full p-1.5 cursor-pointer hover:bg-blue-600 transition-colors">
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
                  
                  {/* バッジ選択ボタン - バッジがない場合のみ表示 */}
                  {isOwnProfile && !selectedBadge && (
                    <button 
                      onClick={() => setShowBadgeSelector(!showBadgeSelector)}
                      className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1.5 cursor-pointer hover:bg-blue-600 transition-colors"
                    >
                      <FiAward className="text-sm" />
                    </button>
                  )}
                </div>
                
                {/* バッジセレクターをモーダルとして実装 - 画面中央に配置 */}
                <AnimatePresence>
                  {showBadgeSelector && (
                    <>
                      {/* モーダルオーバーレイ */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={() => setShowBadgeSelector(false)}
                      />
                      
                      {/* モーダルコンテンツ */}
                      <motion.div 
                        ref={badgeSelectorRef}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 max-h-[80vh] overflow-y-auto bg-slate-800/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50"
                      >
                        <div className="p-3 border-b border-white/10 flex justify-between items-center">
                          <h3 className="text-lg font-medium">バッジを選択</h3>
                          <button
                            onClick={() => setShowBadgeSelector(false)} 
                            className="text-white/60 hover:text-white"
                          >
                            <FiX />
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          {/* バッジなしオプション */}
                          <button
                            onClick={() => handleBadgeSelect(null)}
                            className={`flex items-center gap-3 w-full p-3 rounded-md hover:bg-white/10 transition-colors ${
                              selectedBadge === null ? 'bg-blue-500/30 border border-blue-500/50' : ''
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                              <FiX size={16} />
                            </div>
                            <div className="text-left">
                              <span className="text-sm block font-medium">なし</span>
                              <span className="text-xs text-slate-400">バッジを表示しない</span>
                            </div>
                          </button>
                          
                          {/* 管理者バッジの特別表示 - 管理者の場合のみ */}
                          {isAdmin && (
                            <button
                              onClick={() => handleBadgeSelect("admin")}
                              className={`flex items-center gap-3 w-full p-3 rounded-md hover:bg-white/10 transition-colors ${
                                selectedBadge === "admin" ? 'bg-blue-500/30 border border-blue-500/50' : ''
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-red-700/50 flex items-center justify-center">
                                <FiInfo className="text-red-400 text-lg" />
                              </div>
                              <div className="text-left">
                                <span className="text-sm block font-medium">管理者</span>
                                <span className="text-xs text-slate-400">サイト管理者用特別バッジ</span>
                              </div>
                            </button>
                          )}
                          
                          {/* 獲得済みバッジ - 利用可能なバッジからadminを除外 */}
                          {availableBadges
                            .filter(badge => badge.id !== "admin") // 管理者バッジを除外
                            .map(badge => (
                              <button
                                key={badge.id}
                                onClick={() => handleBadgeSelect(badge.id)}
                                className={`flex items-center gap-3 w-full p-3 rounded-md hover:bg-white/10 transition-colors ${
                                  selectedBadge === badge.id ? 'bg-blue-500/30 border border-blue-500/50' : ''
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                                  <badge.icon className={`${badge.color} text-lg`} />
                                </div>
                                <div className="text-left">
                                  <span className="text-sm block font-medium">{badge.name}</span>
                                  <span className="text-xs text-slate-400">{badge.description}</span>
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                
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
              
              {/* ユーザー統計情報 */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{userStats.articleCount}</div>
                  <div className="text-xs text-slate-400">記事数</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-pink-400">{userStats.likeCount}</div>
                  <div className="text-xs text-slate-400">獲得いいね</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{userStats.usefulCount}</div>
                  <div className="text-xs text-slate-400">獲得「使えた！」</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {userStats.averageScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-400">平均評価値</div>
                </div>
              </div>
              
              {/* 自己紹介 */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-slate-300">自己紹介</h3>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        setIsEditingBio(!isEditingBio);
                        setNewBio(userBio);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                    >
                      {isEditingBio ? (
                        <>
                          <FiX className="mr-1" /> キャンセル
                        </>
                      ) : (
                        <>
                          <FiEdit2 className="mr-1" /> 編集
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {isEditingBio ? (
                  <div>
                    <textarea
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value)}
                      rows={4}
                      className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/40"
                      placeholder="自己紹介を入力してください..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleBioUpdate}
                        className="bg-blue-500 hover:bg-blue-600 px-4 py-1 rounded-md flex items-center text-sm"
                      >
                        <FiSave className="mr-1" /> 保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-lg p-4">
                    {userBio ? (
                      <p className="whitespace-pre-wrap text-sm">{userBio}</p>
                    ) : (
                      <p className="text-slate-400 text-sm italic">
                        {isOwnProfile ? "自己紹介がまだ設定されていません。" : "このユーザーはまだ自己紹介を設定していません。"}
                      </p>
                    )}
                  </div>
                )}
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
          
          {/* トロフィーセクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 sm:p-8 mb-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <FiAward className="text-yellow-400 text-xl" />
              <h2 className="text-xl font-semibold">獲得トロフィー</h2>
              <div className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                {earnedTrophies.length} / {allTrophies.length}
              </div>
            </div>
            
            {earnedTrophies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {earnedTrophies.map((trophy) => (
                  <div 
                    key={trophy.id}
                    className={`bg-white/5 border border-white/10 rounded-lg p-4 flex items-start gap-3 ${
                      newTrophies.some(t => t.id === trophy.id) ? 'animate-pulse border-yellow-500/50' : ''
                    }`}
                  >
                    <div className={`${trophy.color} text-xl flex-shrink-0 mt-0.5`}>
                      <trophy.icon />
                    </div>
                    <div>
                      <h3 className="font-medium text-white flex items-center gap-1">
                        {trophy.title}
                        {trophy.level && (
                          <span className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded-full">
                            Lv.{trophy.level}
                          </span>
                        )}
                        {newTrophies.some(t => t.id === trophy.id) && (
                          <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded-full ml-1">
                            NEW
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-300">{trophy.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-lg">
                <p className="text-slate-400">まだトロフィーを獲得していません</p>
                <p className="text-sm text-slate-500 mt-1">
                  記事を投稿して「いいね」や「使えた！」を集めると、トロフィーが獲得できます
                </p>
              </div>
            )}
          </motion.div>

          {/* 投稿記事セクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}