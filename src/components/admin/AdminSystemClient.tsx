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
import { 
  getFirestore, collection, doc, getDoc, getDocs, setDoc, 
  writeBatch, query, where, Timestamp, updateDoc
} from "firebase/firestore";
import { db, searchDb } from "../../firebase/config";
import { calculateArticleScore } from "../../utils/articleScoreCalculator";
import { synchronizeAllAuthorStats } from "../../utils/authorStatsSynchronizer";

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
  const [syncingAuthorStats, setSyncingAuthorStats] = useState(false);
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
        const articleDocs = await getDocs(articleQuery)
          .catch(err => {
            console.error("記事取得エラー:", err);
            return { size: 0, docs: [] };
          });
        const articleCount = articleDocs.size;
        
        // ユーザー数を取得
        const userQuery = collection(db, 'users');
        const userDocs = await getDocs(userQuery)
          .catch(err => {
            console.error("ユーザー取得エラー:", err);
            return { size: 0, docs: [] };
          });
        const userCount = userDocs.size;
        
        // タグ数を取得
        const tagQuery = collection(searchDb, 'tags');
        const tagDocs = await getDocs(tagQuery)
          .catch(err => {
            console.error("タグ取得エラー:", err);
            return { size: 0, docs: [] };
          });
        const tagCount = tagDocs.size;
        
        // コメント数は各記事のサブコレクションなので概算
        let commentCount = 0;
        if (articleDocs.size <= 100 && articleDocs.docs?.length > 0) { // 記事数が多い場合は一部のみサンプリング
          for (const articleDoc of articleDocs.docs) {
            try {
              const commentQuery = collection(db, 'wikiArticles', articleDoc.id, 'comments');
              const commentDocs = await getDocs(commentQuery);
              commentCount += commentDocs.size;
            } catch (commentErr) {
              console.error(`記事${articleDoc.id}のコメント取得エラー:`, commentErr);
            }
          }
        } else {
          // 記事数が多い場合は推定値
          commentCount = Math.round(articleCount * 2.5); // 平均コメント数で推定
        }
        
        // 最後の計算日時 - デフォルト値を設定
        let lastCalculated = '未計算';
        try {
          const lastUpdatedRef = doc(db, 'info', 'stats');
          const lastUpdatedDoc = await getDoc(lastUpdatedRef);
          if (lastUpdatedDoc.exists() && lastUpdatedDoc.data().timestamp) {
            lastCalculated = new Date(lastUpdatedDoc.data().timestamp).toLocaleString('ja-JP');
          }
        } catch (timeErr) {
          console.error("最終更新時刻取得エラー:", timeErr);
        }
        
        setSystemStats({
          articleCount,
          userCount,
          commentCount,
          tagCount,
          lastCalculated
        });
      } catch (error) {
        console.error("システム統計取得エラー:", error);
        // エラーが発生してもデフォルト値を設定
        setSystemStats({
          articleCount: 0,
          userCount: 0,
          commentCount: 0,
          tagCount: 0,
          lastCalculated: 'エラーが発生しました'
        });
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchSystemStats();
  }, [user, isAdmin]);

  // インデックス再構築処理 - クライアントサイドで実行するように変更
  const handleRebuildIndex = async () => {
    if (rebuildingIndex) return;
    
    setRebuildingIndex(true);
    setOperationResult(null);
    
    try {
      // 処理開始時間
      const startTime = Date.now();
      
      // 検索インデックスの再構築処理をクライアントサイドで実行
      const { processedArticles, processedTags } = await rebuildSearchIndex();
      
      // 処理完了時間記録
      await setDoc(doc(searchDb, 'system', 'indexLastRebuilt'), {
        timestamp: Date.now(),
        rebuiltBy: user?.uid || 'unknown'
      });
      
      // その他のシステムデータも更新
      await setDoc(doc(searchDb, 'system', 'otherLastUpdated'), {
        timestamp: Date.now()
      });
      
      // 処理時間
      const processingTime = (Date.now() - startTime) / 1000;
      
      setOperationResult({
        success: true,
        message: `インデックスを正常に再構築しました（記事${processedArticles}件、タグ${processedTags}件、処理時間: ${processingTime.toFixed(2)}秒）`,
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

  // 検索インデックスを再構築する関数 - APIルートからクライアントに移行
  async function rebuildSearchIndex() {
    let processedArticles = 0;
    let processedTags = 0;
    
    // 1. 記事概要のインデックスを再構築
    const articlesRef = collection(db, 'wikiArticles');
    const articleSnapshot = await getDocs(articlesRef);
    
    // バッチ処理用
    let batch = writeBatch(searchDb);
    let batchCount = 0;
    
    // タグカウントを集計するオブジェクト
    const tagCounts: { [tagName: string]: number } = {};
    
    // 各記事を処理
    for (const docSnapshot of articleSnapshot.docs) {
      const articleData = docSnapshot.data();
      const articleId = docSnapshot.id;
      
      // IDが存在しない場合はスキップ
      if (!articleId) continue;
      
      // 記事スコアを計算
      const score = calculateArticleScore(
        articleData.content || '',
        articleData.likeCount || 0,
        articleData.usefulCount || 0,
        articleData.dislikeCount || 0
      );
      
      // 記事概要を作成
      const summaryRef = doc(searchDb, 'articleSummaries', articleId);
      batch.set(summaryRef, {
        id: articleId,
        title: articleData.title || '',
        description: articleData.description || '',
        tags: articleData.tags || [],
        author: articleData.author || '',
        authorId: articleData.authorId || '',
        imageUrl: articleData.imageUrl || null,
        date: articleData.date || Timestamp.now(),
        lastUpdated: articleData.lastUpdated || Timestamp.now(),
        usefulCount: articleData.usefulCount || 0,
        likeCount: articleData.likeCount || 0,
        dislikeCount: articleData.dislikeCount || 0,
        articleScore: score
      });
      
      // タグカウントを更新
      if (Array.isArray(articleData.tags)) {
        articleData.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
      
      processedArticles++;
      batchCount++;
      
      // 500件ごとにバッチコミット
      if (batchCount >= 500) {
        await batch.commit();
        batch = writeBatch(searchDb);
        batchCount = 0;
      }
    }
    
    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // 2. タグのインデックスを再構築
    batch = writeBatch(searchDb);
    batchCount = 0;
    
    // 各タグを処理
    for (const [tagName, count] of Object.entries(tagCounts)) {
      const tagRef = doc(searchDb, 'tags', tagName);
      batch.set(tagRef, {
        count,
        lastUsed: Timestamp.now()
      });
      
      processedTags++;
      batchCount++;
      
      // 500件ごとにバッチコミット
      if (batchCount >= 500) {
        await batch.commit();
        batch = writeBatch(searchDb);
        batchCount = 0;
      }
    }
    
    // 残りのバッチをコミット
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return { processedArticles, processedTags };
  }

  // 著者スコア同期処理 - クライアントサイドで実行するように変更
  const handleSyncAuthorStats = async () => {
    if (syncingAuthorStats) return;
    
    setSyncingAuthorStats(true);
    setOperationResult(null);
    
    try {
      // 処理開始時間
      const startTime = Date.now();
      
      // 著者スコア同期処理をクライアントサイドで実行
      const { processed, errors } = await synchronizeAllAuthorStats();
      
      // 処理時間
      const processingTime = (Date.now() - startTime) / 1000;
      
      setOperationResult({
        success: true,
        message: `著者スコアを同期しました (${processed}件処理, ${errors}件エラー, 処理時間: ${processingTime.toFixed(2)}秒)`,
        type: 'sync'
      });
    } catch (error) {
      console.error('著者スコア同期エラー:', error);
      setOperationResult({
        success: false,
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        type: 'sync'
      });
    } finally {
      setSyncingAuthorStats(false);
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
            {/* システム統計情報 */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <FiActivity className="text-blue-400 mr-2" />
                システム統計情報(当てにはならない)
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

                {/* 著者スコア同期 - 新しく追加 */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-full bg-indigo-500/20">
                      <FiUsers className="text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold">著者スコア同期</h3>
                  </div>
                  
                  <p className="text-slate-300 mb-4">
                    著者スコアの合計値を全記事から計算し直して同期します。記事スコアと著者スコアに不一致がある場合に実行してください。
                  </p>
                  
                  <button
                    onClick={handleSyncAuthorStats}
                    disabled={syncingAuthorStats}
                    className={`w-full py-3 rounded-lg font-medium ${
                      syncingAuthorStats 
                        ? 'bg-slate-600/50 text-slate-300 cursor-not-allowed' 
                        : 'bg-indigo-500/80 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {syncingAuthorStats ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>処理中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <FiRefreshCw />
                        <span>著者スコアを同期</span>
                      </div>
                    )}
                  </button>
                  
                  {operationResult && operationResult.type === 'sync' && (
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
