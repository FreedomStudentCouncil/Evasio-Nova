"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiUser, FiCalendar, FiCheckCircle, FiThumbsUp, FiAlertTriangle, FiCamera } from "react-icons/fi";
import { getUserArticles, WikiArticle } from "../firebase/wiki";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { updateProfileImage } from "../firebase/user";

export default function UserProfilePageClient() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("ユーザー");
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
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
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{username}</h1>
                  <p className="text-slate-300">投稿記事数: {articles.length}</p>
                </div>
              </div>
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