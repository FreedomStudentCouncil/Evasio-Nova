"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiUsers, FiSearch, FiChevronLeft, FiUserCheck, FiUserX, 
  FiMail, FiCheckCircle, FiXCircle, FiEdit, FiAward
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { collection, query, getDocs, doc, updateDoc, orderBy, limit, startAfter, where } from "firebase/firestore";
import { db } from "../../firebase/config";

interface User {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: any;
  lastLoginAt: any;
  photoURL?: string;
  isAdmin?: boolean;
  isBlocked?: boolean;
  earnedTrophies?: string[];
}

export default function AdminUsersClient() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 管理者でない場合はリダイレクト
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  // ユーザー一覧を取得
  const fetchUsers = async (isInitial = false) => {
    if (isSearching) return;
    
    try {
      setIsLoading(true);
      
      let usersQuery;
      
      if (isInitial) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      } else if (lastVisible) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(20)
        );
      } else {
        setIsLoading(false);
        return;
      }
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }
      
      // 最後の取得アイテムを保存
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      setUsers(prev => isInitial ? fetchedUsers : [...prev, ...fetchedUsers]);
      setHasMore(querySnapshot.docs.length === 20);
    } catch (error) {
      console.error("ユーザー取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回ロード
  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers(true);
    }
  }, [user, isAdmin]);

  // ユーザー検索
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setIsLoading(true);
    
    try {
      // 名前検索
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff'),
        limit(20)
      );
      
      // メール検索
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', searchTerm),
        where('email', '<=', searchTerm + '\uf8ff'),
        limit(20)
      );
      
      const [nameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery)
      ]);
      
      const nameResults = nameSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      const emailResults = emailSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // 重複を排除して結合
      const combinedResults = [...nameResults];
      emailResults.forEach(emailUser => {
        if (!combinedResults.some(user => user.id === emailUser.id)) {
          combinedResults.push(emailUser);
        }
      });
      
      setSearchResults(combinedResults);
    } catch (error) {
      console.error("ユーザー検索エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーのブロック状態を更新
  const toggleUserBlock = async (userId: string, currentBlockState: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isBlocked: !currentBlockState });
      
      // 状態を更新
      if (isSearching) {
        setSearchResults(prev => 
          prev.map(u => u.id === userId ? { ...u, isBlocked: !currentBlockState } : u)
        );
      } else {
        setUsers(prev => 
          prev.map(u => u.id === userId ? { ...u, isBlocked: !currentBlockState } : u)
        );
      }
    } catch (error) {
      console.error("ユーザーブロック更新エラー:", error);
    }
  };

  // 検索ハンドラ
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers();
  };

  // 検索クリア
  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setSearchResults([]);
  };

  // 表示するユーザーリスト
  const displayUsers = isSearching ? searchResults : users;

  // ローディング中は表示しない
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div>ロード中...</div>
      </div>
    );
  }

  // 管理者でない場合は表示しない
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <button className="flex items-center text-blue-400 hover:text-blue-300 transition-colors">
                  <FiChevronLeft className="mr-1" /> ダッシュボードに戻る
                </button>
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden mb-8"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <FiUsers className="text-2xl text-blue-400" />
                <h1 className="text-2xl font-bold">ユーザー管理</h1>
              </div>
              <p className="text-slate-300">
                ユーザーの確認、検索、および特定のアクションを実行できます。
              </p>
            </div>

            {/* 検索フォーム */}
            <div className="p-6 border-b border-white/10">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ユーザー名またはメールで検索..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  検索
                </button>
                {isSearching && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    クリア
                  </button>
                )}
              </form>
            </div>

            {/* ユーザーリスト */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : displayUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {isSearching ? 
                    "検索結果はありません" : 
                    "ユーザーが見つかりませんでした"
                  }
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="text-left p-3">ユーザー</th>
                          <th className="text-left p-3">メール</th>
                          <th className="text-center p-3">認証</th>
                          <th className="text-center p-3">トロフィー</th>
                          <th className="text-center p-3">ステータス</th>
                          <th className="text-center p-3">アクション</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {displayUsers.map(user => (
                          <tr key={user.id} className="hover:bg-white/5">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                                  {user.photoURL ? (
                                    <img 
                                      src={user.photoURL} 
                                      alt={user.displayName || "ユーザー"} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <FiUsers />
                                  )}
                                </div>
                                <div>
                                  <Link href={`/wiki/user?id=${user.id}`} className="font-medium text-blue-400 hover:text-blue-300">
                                    {user.displayName || "名前なし"}
                                  </Link>
                                  <div className="text-xs text-slate-400">ID: {user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FiMail className="text-slate-400" />
                                <span>{user.email || "不明"}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {user.emailVerified ? (
                                <div className="flex items-center justify-center gap-1 text-green-400">
                                  <FiCheckCircle />
                                  <span>認証済</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-amber-400">
                                  <FiXCircle />
                                  <span>未認証</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <FiAward className="text-yellow-400" />
                                <span>{user.earnedTrophies?.length || 0}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {user.isBlocked ? (
                                <div className="bg-red-500/20 text-red-400 rounded-full px-3 py-1 text-xs inline-flex items-center">
                                  <FiUserX className="mr-1" />
                                  ブロック中
                                </div>
                              ) : (
                                <div className="bg-green-500/20 text-green-400 rounded-full px-3 py-1 text-xs inline-flex items-center">
                                  <FiUserCheck className="mr-1" />
                                  アクティブ
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => toggleUserBlock(user.id, !!user.isBlocked)}
                                  className={`p-2 rounded-lg ${
                                    user.isBlocked 
                                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                  }`}
                                  title={user.isBlocked ? "ブロック解除" : "ブロック"}
                                >
                                  {user.isBlocked ? <FiUserCheck /> : <FiUserX />}
                                </button>
                                <Link href={`/wiki/user?id=${user.id}`}>
                                  <button
                                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                    title="プロフィールを見る"
                                  >
                                    <FiEdit />
                                  </button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* もっと読み込むボタン */}
                  {!isSearching && hasMore && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => fetchUsers()}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        {isLoading ? "読み込み中..." : "さらに読み込む"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
