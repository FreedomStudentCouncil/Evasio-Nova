"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiDatabase, FiChevronLeft, FiRefreshCw, FiCheck, FiAlertTriangle,
  FiServer, FiCpu, FiHardDrive, FiCloud, FiActivity, FiUsers, FiFileText,
  FiHash, FiMessageSquare
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, searchDb } from "../../firebase/config";

interface SystemStats {
  articleCount: number;
  userCount: number;
  commentCount: number;
  tagCount: number;
  lastCalculated: string;
}

export default function AdminSystemClient() {
  const router = useRouter();
  const { user, isAdmin, loading, getIdToken } = useAuth();
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    message: string;
    type: string;
  } | null>(null);

  // 管理者でない場合はリダイレクト
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  // システム統計情報を取得
  useEffect(() => {
    const fetchSystemStats = async () => {
      if (!user || !isAdmin) return;
      
      try {
        setIsLoadingStats(true);
        
        // 記事数を取得
        const articleQuery = collection(searchDb, 'articleSummaries');
        const articleDocs = await getDocs(articleQuery);
        const articleCount = articleDocs.size;
        
        // ユーザー数を取得
        const userQuery = collection(db, 'users');
        const userDocs = await getDocs(userQuery);
        const userCount = userDocs.size;
        
        // タグ数を取得
        const tagQuery = collection(searchDb, 'tags');
        const tagDocs = await getDocs(tagQuery);
        const tagCount = tagDocs.size;
        
        // コメント数は各記事のサブコレクションなので概算
        let commentCount = 0;
        if (articleDocs.size <= 100) { // 記事数が多い場合は一部のみサンプリング
          for (const articleDoc of articleDocs.docs) {
            const commentQuery = collection(db, 'wikiArticles', articleDoc.id, 'comments');
            const commentDocs = await getDocs(commentQuery);
            commentCount += commentDocs.size;
          }
        } else {
          // 記事数が多い場合は推定値
          commentCount = Math.round(articleCount * 2.5); // 平均コメント数で推定
        }
        
        // 最後の計算日時
        const lastUpdatedDoc = await getDoc(doc(searchDb, 'system', 'lastUpdated'));
        const lastCalculated = lastUpdatedDoc.exists() 
          ? new Date(lastUpdatedDoc.data().timestamp).toLocaleString('ja-JP')
          : '未計算';
        
        setSystemStats({
          articleCount,
          userCount,
          commentCount,
          tagCount,
          lastCalculated
        });
      } catch (error) {
        console.error("システム統計取得エラー:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchSystemStats();
  }, [user, isAdmin]);

  // キャッシュクリア処理
  const handleClearCache = async () => {
    if (clearingCache) return;
    
    setClearingCache(true);
    setOperationResult(null);
    
    try {
      const token = await getIdToken();
      
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Id': user?.uid || ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'キャッシュクリア中にエラーが発生しました');
      }
      
      const result = await response.json();
      
      setOperationResult({
        success: true,
        message: 'キャッシュを正常にクリアしました',
        type: 'cache'
      });
      
      // システム情報を更新
      await setDoc(doc(searchDb, 'system', 'cacheLastCleared'), {
        timestamp: Date.now(),
        clearedBy: user?.uid || 'unknown'
      });
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
      setOperationResult({
        success: false,
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        type: 'cache'
      });
    } finally {
      setClearingCache(false);
    }
  };

  // インデックス再構築処理
  const handleRebuildIndex = async () => {
    if (rebuildingIndex) return;
    
    setRebuildingIndex(true);
    setOperationResult(null);
    
    try {
      const token = await getIdToken();
      
      const response = await fetch('/api/admin/rebuild-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Id': user?.uid || ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'インデックス再構築中にエラーが発生しました');
      }
      
      const result = await response.json();
      
      setOperationResult({
        success: true,
        message: 'インデックスを正常に再構築しました',
        type: 'index'
      });
      
      // システム情報を更新
      await setDoc(doc(searchDb, 'system', 'indexLastRebuilt'), {
        timestamp: Date.now(),
        rebuiltBy: user?.uid || 'unknown'
      });
    } catch (error) {
      console.error('インデックス再構築エラー:', error);
      setOperationResult({
        success: false,
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        type: 'index'
      });
    } finally {
      setRebuildingIndex(false);
    }
  };

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
                <FiDatabase className="text-2xl text-purple-400" />
                <h1 className="text-2xl font-bold">システム管理</h1>
              </div>
              <p className="text-slate-300">
                システム情報の確認、キャッシュのクリア、インデックスの再構築などを行います。
              </p>
            </div>

            {/* システム統計情報 */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FiActivity className="text-blue-400 mr-2" />
                システム統計情報
              </h2>
              
              {isLoadingStats ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : systemStats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    icon={<FiFileText className="text-blue-400" />}
                    title="記事数"
                    value={systemStats.articleCount.toString()}
                  />
                  <StatCard 
                    icon={<FiUsers className="text-green-400" />}
                    title="ユーザー数"
                    value={systemStats.userCount.toString()}
                  />
                  <StatCard 
                    icon={<FiMessageSquare className="text-amber-400" />}
                    title="コメント数"
                    value={systemStats.commentCount.toString()}
                  />
                  <StatCard 
                    icon={<FiHash className="text-purple-400" />}
                    title="タグ数"
                    value={systemStats.tagCount.toString()}
                  />
                </div>
              ) : (
                <p className="text-center text-slate-400 py-4">
                  システム情報を取得できませんでした
                </p>
              )}
              
              <div className="mt-4 text-sm text-slate-400">
                最終更新: {systemStats?.lastCalculated || '未更新'}
              </div>
            </div>

            {/* 運用管理 */}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FiServer className="text-purple-400 mr-2" />
                運用管理
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* キャッシュクリア */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-full bg-blue-500/20">
                      <FiCloud className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold">キャッシュクリア</h3>
                  </div>
                  
                  <p className="text-slate-300 mb-4">
                    システムのキャッシュをクリアします。これにより最新のデータが表示されるようになります。
                  </p>
                  
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className={`w-full py-3 rounded-lg font-medium ${
                      clearingCache 
                        ? 'bg-slate-600/50 text-slate-300 cursor-not-allowed' 
                        : 'bg-blue-500/80 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {clearingCache ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>処理中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw />
                        <span>キャッシュをクリア</span>
                      </div>
                    )}
                  </button>
                  
                  {operationResult && operationResult.type === 'cache' && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      operationResult.success 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <div className="flex items-start gap-2">
                        {operationResult.success ? (
                          <FiCheck className="mt-0.5" />
                        ) : (
                          <FiAlertTriangle className="mt-0.5" />
                        )}
                        <span>{operationResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* インデックス再構築 */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-full bg-purple-500/20">
                      <FiCpu className="text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold">インデックス再構築</h3>
                  </div>
                  
                  <p className="text-slate-300 mb-4">
                    検索インデックスを再構築します。検索結果が正しく表示されない場合に実行してください。
                  </p>
                  
                  <button
                    onClick={handleRebuildIndex}
                    disabled={rebuildingIndex}
                    className={`w-full py-3 rounded-lg font-medium ${
                      rebuildingIndex 
                        ? 'bg-slate-600/50 text-slate-300 cursor-not-allowed' 
                        : 'bg-purple-500/80 hover:bg-purple-500 text-white'
                    }`}
                  >
                    {rebuildingIndex ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>処理中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw />
                        <span>インデックスを再構築</span>
                      </div>
                    )}
                  </button>
                  
                  {operationResult && operationResult.type === 'index' && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      operationResult.success 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      <div className="flex items-start gap-2">
                        {operationResult.success ? (
                          <FiCheck className="mt-0.5" />
                        ) : (
                          <FiAlertTriangle className="mt-0.5" />
                        )}
                        <span>{operationResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// 統計カード
function StatCard({ 
  icon, 
  title, 
  value 
}: { 
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-white/10">
          {icon}
        </div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="text-2xl font-bold ml-11">
        {value}
      </div>
    </div>
  );
}
