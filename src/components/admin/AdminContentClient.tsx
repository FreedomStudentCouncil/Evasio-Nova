"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiFileText, FiSearch, FiChevronLeft, FiEye, FiEdit, FiTrash2, 
  FiAlertTriangle, FiThumbsDown, FiThumbsUp, FiCheck
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  collection, query, getDocs, doc, deleteDoc, where, 
  orderBy, limit, startAfter, increment, updateDoc
} from "firebase/firestore";
import { db, searchDb } from "../../firebase/config";
import { incrementDislikeCount } from "../../firebase/wiki";
import { ArticleSummary } from "../../types/wiki";

export default function AdminContentClient() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ArticleSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // 管理者でない場合はリダイレクト
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  // 記事一覧を取得
  const fetchArticles = async (isInitial = false) => {
    if (isSearching) return;
    
    try {
      setIsLoading(true);
      
      let articlesQuery;
      
      if (isInitial) {
        articlesQuery = query(
          collection(searchDb, 'articleSummaries'),
          orderBy('date', 'desc'),
          limit(20)
        );
      } else if (lastVisible) {
        articlesQuery = query(
          collection(searchDb, 'articleSummaries'),
          orderBy('date', 'desc'),
          startAfter(lastVisible),
          limit(20)
        );
      } else {
        setIsLoading(false);
        return;
      }
      
      const querySnapshot = await getDocs(articlesQuery);
      
      if (querySnapshot.empty) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }
      
      // 最後の取得アイテムを保存
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);
      
      const fetchedArticles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArticleSummary[];
      
      setArticles(prev => isInitial ? fetchedArticles : [...prev, ...fetchedArticles]);
      setHasMore(querySnapshot.docs.length === 20);
    } catch (error) {
      console.error("記事取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回ロード
  useEffect(() => {
    if (user && isAdmin) {
      fetchArticles(true);
    }
  }, [user, isAdmin]);

  // 記事検索
  const searchArticles = async () => {
    if (!searchTerm.trim()) {
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setIsLoading(true);
    
    try {
      // タイトル検索
      const titleQuery = query(
        collection(searchDb, 'articleSummaries'),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff'),
        limit(20)
      );
      
      // タグ検索
      const tagQuery = query(
        collection(searchDb, 'articleSummaries'),
        where('tags', 'array-contains', searchTerm.toLowerCase()),
        limit(20)
      );
      
      const [titleSnapshot, tagSnapshot] = await Promise.all([
        getDocs(titleQuery),
        getDocs(tagQuery)
      ]);
      
      const titleResults = titleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArticleSummary[];
      
      const tagResults = tagSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ArticleSummary[];
      
      // 重複を排除して結合
      const combinedResults = [...titleResults];
      tagResults.forEach(tagArticle => {
        if (!combinedResults.some(article => article.id === tagArticle.id)) {
          combinedResults.push(tagArticle);
        }
      });
      
      setSearchResults(combinedResults);
    } catch (error) {
      console.error("記事検索エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 記事を削除
  const deleteArticle = async () => {
    if (!selectedArticle || isDeleting) return;
    
    setIsDeleting(true);
    try {
      // メインDBから削除
      await deleteDoc(doc(db, 'wikiArticles', selectedArticle.id));
      
      // 検索用DBからも削除
      await deleteDoc(doc(searchDb, 'articleSummaries', selectedArticle.id));
      
      // 画面の記事リストを更新
      if (isSearching) {
        setSearchResults(prev => prev.filter(a => a.id !== selectedArticle.id));
      } else {
        setArticles(prev => prev.filter(a => a.id !== selectedArticle.id));
      }
      
      setDeleteSuccess(true);
      
      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        setShowDeleteModal(false);
        setSelectedArticle(null);
        setDeleteSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("記事削除エラー:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // 記事に低評価をつける
  const dislikeArticle = async (article: ArticleSummary) => {
    try {
      await incrementDislikeCount(article.id, true);
      
      // 画面の記事リストを更新
      const updatedArticle = {
        ...article,
        dislikeCount: (article.dislikeCount || 0) + 1
      };
      
      if (isSearching) {
        setSearchResults(prev => 
          prev.map(a => a.id === article.id ? updatedArticle : a)
        );
      } else {
        setArticles(prev => 
          prev.map(a => a.id === article.id ? updatedArticle : a)
        );
      }
    } catch (error) {
      console.error("低評価付与エラー:", error);
    }
  };

  // 検索ハンドラ
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchArticles();
  };

  // 検索クリア
  const clearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setSearchResults([]);
  };

  // 表示する記事リスト
  const displayArticles = isSearching ? searchResults : articles;

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
                <FiFileText className="text-2xl text-green-400" />
                <h1 className="text-2xl font-bold">コンテンツ管理</h1>
              </div>
              <p className="text-slate-300">
                Wiki記事の確認、編集、削除などを行います。低評価やタグ修正も可能です。
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
                    placeholder="記事タイトルまたはタグで検索..."
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

            {/* 記事リスト */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full"></div>
                </div>
              ) : displayArticles.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  {isSearching ? 
                    "検索結果はありません" : 
                    "記事が見つかりませんでした"
                  }
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="text-left p-3">タイトル</th>
                          <th className="text-left p-3">著者</th>
                          <th className="text-center p-3">スコア</th>
                          <th className="text-center p-3">いいね</th>
                          <th className="text-center p-3">低評価</th>
                          <th className="text-center p-3">アクション</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {displayArticles.map(article => (
                          <tr key={article.id} className="hover:bg-white/5">
                            <td className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-white/10 flex items-center justify-center overflow-hidden">
                                  {article.imageUrl ? (
                                    <img 
                                      src={article.imageUrl} 
                                      alt={article.title} 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <FiFileText className="text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <Link href={`/wiki/view?id=${article.id}`} className="font-medium text-blue-400 hover:text-blue-300">
                                    {article.title}
                                  </Link>
                                  <div className="text-xs text-slate-400 mt-1">
                                    {article.tags?.map((tag, index) => (
                                      <span key={index} className="mr-2">#{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <Link href={`/wiki/user?id=${article.authorId}`} className="text-blue-400 hover:text-blue-300">
                                {article.author}
                              </Link>
                            </td>
                            <td className="p-3 text-center">
                              <div className={`font-medium ${
                                (article.articleScore || 0) >= 80 ? 'text-green-400' :
                                (article.articleScore || 0) >= 60 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {Math.round(article.articleScore || 0)}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <FiThumbsUp className="text-blue-400" />
                                <span>{article.likeCount || 0}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <FiThumbsDown className="text-red-400" />
                                <span>{article.dislikeCount || 0}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-2">
                                <Link href={`/wiki/view?id=${article.id}`}>
                                  <button
                                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                    title="記事を見る"
                                  >
                                    <FiEye />
                                  </button>
                                </Link>
                                <Link href={`/wiki/edit?id=${article.id}`}>
                                  <button
                                    className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                                    title="編集する"
                                  >
                                    <FiEdit />
                                  </button>
                                </Link>
                                <button
                                  onClick={() => dislikeArticle(article)}
                                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                  title="低評価をつける"
                                >
                                  <FiThumbsDown />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedArticle(article);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                  title="削除する"
                                >
                                  <FiTrash2 />
                                </button>
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
                        onClick={() => fetchArticles()}
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

      {/* 削除確認モーダル */}
      {showDeleteModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-white/10 p-6 max-w-md w-full"
          >
            {deleteSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="text-3xl text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">削除完了</h3>
                <p className="text-slate-300 mb-4">記事が正常に削除されました</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 text-red-400">
                  <FiAlertTriangle className="text-2xl" />
                  <h3 className="text-xl font-bold">記事を削除しますか？</h3>
                </div>
                <p className="text-slate-300 mb-6">
                  <span className="font-medium text-white">{selectedArticle.title}</span> を削除します。この操作は取り消せません。
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={deleteArticle}
                    disabled={isDeleting}
                    className={`flex-1 py-3 bg-red-500 rounded-lg font-semibold
                      ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'}`}
                  >
                    {isDeleting ? '削除中...' : '削除する'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedArticle(null);
                    }}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/20"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
