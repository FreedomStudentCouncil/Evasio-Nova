"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiShield, FiRefreshCw, FiCheck, FiAlertTriangle, FiChevronRight, 
  FiUsers, FiFileText, FiDatabase, FiZap, FiClock, FiAward, FiBriefcase
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { 
  RecalculationResult, ArticleSummary
} from "../types/wiki";
//, ArticleScoreResult, TrophyResult, AuthorStatsResult 
import { 
  collection, getDocs, doc, getDoc, query, 
  where, writeBatch, setDoc, Timestamp, updateDoc
} from "firebase/firestore";
import { db, searchDb } from "../firebase/config";
import { calculateArticleScore } from "../utils/articleScoreCalculator";
import { calculateUserTrophies, getAvailableBadges } from "../utils/trophies";

// 記事スコア計算結果の型定義
interface ArticleScoreResult {
  id: string;
  title: string;
  oldScore: number;
  newScore: number;
}

// 著者スコア結果の型定義
interface AuthorStatsResult {
  authorId: string;
  articles: number;
  totalScore: number;
  averageScore: number;
}

// トロフィー計算結果の型定義
interface TrophyResult {
  userId: string;
  trophyCount: number;
  badgeCount: number;
  stats: {
    articleCount: number;
    likeCount: number;
    usefulCount: number;
    averageScore: number;
  };
}

// 結果が記事スコア結果かどうかを判定する関数
function isArticleScoreResult(result: any): result is ArticleScoreResult {
  return result && 'title' in result && 'oldScore' in result && 'newScore' in result;
}

// 結果がトロフィー結果かどうかを判定する関数
function isTrophyResult(result: any): result is TrophyResult {
  return result && 'userId' in result && 'trophyCount' in result && 'badgeCount' in result;
}

// 結果が著者スコア結果かどうかを判定する関数
function isAuthorStatsResult(result: any): result is AuthorStatsResult {
  return result && 'authorId' in result && 'articles' in result && 'totalScore' in result;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const { user, isAdmin, loading, getIdToken } = useAuth();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState<RecalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recalculationType, setRecalculationType] = useState<'all' | 'articles' | 'trophies'>('all');
  const [lastRecalculated, setLastRecalculated] = useState<{[key: string]: string}>({});

  // 管理者でない場合はリダイレクト
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/');
    }
  }, [user, isAdmin, loading, router]);

  // 最終更新時刻を取得
  useEffect(() => {
    const fetchLastUpdated = async () => {
      try {
        if (!user || !isAdmin) return;
        
        // 各データの最終更新時刻を取得
        const [articlesDoc, trophiesDoc, otherDoc] = await Promise.all([
          getDoc(doc(searchDb, 'system', 'lastUpdated')),
          getDoc(doc(searchDb, 'system', 'trophiesLastUpdated')),
          getDoc(doc(searchDb, 'system', 'otherLastUpdated'))
        ]);

        setLastRecalculated({
          articles: articlesDoc.exists() 
            ? new Date(articlesDoc.data().timestamp).toLocaleString('ja-JP') 
            : '未計算',
          trophies: trophiesDoc.exists() 
            ? new Date(trophiesDoc.data().timestamp).toLocaleString('ja-JP') 
            : '未計算',
          other: otherDoc.exists() 
            ? new Date(otherDoc.data().timestamp).toLocaleString('ja-JP') 
            : '未計算'
        });
      } catch (error) {
        console.error('最終更新時刻の取得に失敗:', error);
      }
    };
    
    if (user && isAdmin) {
      fetchLastUpdated();
    }
  }, [user, isAdmin]);

  // スコア再計算処理 - クライアントサイド処理に変更
  const handleRecalculateScores = async () => {
    if (isRecalculating) return;
    
    setIsRecalculating(true);
    setRecalculationResult(null);
    setError(null);
    
    try {
      // 処理開始時間
      const startTime = Date.now();
      
      let result;
      
      // 再計算タイプに応じた処理を実行
      if (recalculationType === 'articles') {
        // 記事スコアのみ再計算
        result = await recalculateArticleScores();
      } else if (recalculationType === 'trophies') {
        // トロフィーのみ再計算
        result = await recalculateTrophiesAndBadges();
      } else {
        // すべてを再計算
        const articleResults = await recalculateArticleScores();
        const authorResults = await recalculateAuthorStats();
        const trophyResults = await recalculateTrophiesAndBadges();
        
        result = {
          processed: articleResults.processed,
          errors: articleResults.errors,
          results: articleResults.results
        };
        
        // 最終更新時刻を記録
        await setDoc(doc(searchDb, 'system', 'lastUpdated'), {
          timestamp: Date.now(),
          updatedBy: user?.uid
        });
      }
      
      setRecalculationResult(result);
      
      // 最終更新時刻を更新
      setLastRecalculated(prev => ({
        ...prev,
        [recalculationType]: new Date().toLocaleString('ja-JP')
      }));
    } catch (err) {
      console.error('再計算エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsRecalculating(false);
    }
  };
  
  // 記事スコアの再計算 - APIルートからクライアントに移行
  async function recalculateArticleScores(): Promise<RecalculationResult> {
    // 記事データを取得
    const articleSummariesRef = collection(searchDb, 'articleSummaries');
    const querySnapshot = await getDocs(articleSummariesRef);
    
    const articles = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ArticleSummary[];

    const batch = writeBatch(searchDb);
    const results: ArticleScoreResult[] = [];
    let processedCount = 0;
    let errorCount = 0;

    // 各記事のスコアを再計算
    for (const article of articles) {
      try {
        // メインDBから詳細な記事データを取得
        const mainArticleRef = doc(db, 'wikiArticles', article.id);
        const mainArticleSnap = await getDoc(mainArticleRef);
        
        if (!mainArticleSnap.exists()) {
          errorCount++;
          continue;
        }
        
        const mainArticleData = mainArticleSnap.data();
        
        // スコアを計算
        const newScore = calculateArticleScore(
          mainArticleData.content,
          article.likeCount || 0,
          article.usefulCount || 0,
          article.dislikeCount || 0
        );
        
        // 検索用DBの記事を更新
        const articleSummaryRef = doc(searchDb, 'articleSummaries', article.id);
        batch.update(articleSummaryRef, { articleScore: newScore });
        
        results.push({
          id: article.id,
          title: article.title || "タイトルなし",
          oldScore: article.articleScore || 0,
          newScore
        });
        
        processedCount++;
      } catch (error) {
        errorCount++;
      }
    }

    // バッチ更新を実行
    await batch.commit();
    
    // 最後の更新日時を記録
    await updateDoc(doc(searchDb, 'system', 'lastUpdated'), {
      timestamp: Date.now()
    });

    return {
      processed: processedCount,
      errors: errorCount,
      results: results.slice(0, 20) as ArticleScoreResult[] // 結果の一部のみ返す
    };
  }
  
  // 著者スコアの再計算 - APIルートからクライアントに移行
  async function recalculateAuthorStats(): Promise<RecalculationResult> {
    const authorCountsRef = doc(searchDb, 'counts', 'author');
    
    // すべての著者IDを取得
    const authorsQuery = query(collection(db, 'users'));
    const authorsSnapshot = await getDocs(authorsQuery);
    const authorIds = authorsSnapshot.docs.map(doc => doc.id);

    const updatedAuthors: AuthorStatsResult[] = [];
    const authorCounts: {[key: string]: any} = {};
    
    // 各著者の統計を再計算
    for (const authorId of authorIds) {
      try {
        // 著者の記事を検索
        const authorArticlesQuery = query(
          collection(searchDb, 'articleSummaries'),
          where('authorId', '==', authorId)
        );
        
        const authorArticlesSnapshot = await getDocs(authorArticlesQuery);
        
        if (authorArticlesSnapshot.empty) {
          // 記事がない場合はスキップ
          continue;
        }
        
        let scoreSum = 0;
        let articleCount = 0;
        let likeCount = 0;
        let usefulCount = 0;
        
        // 記事ごとのスコアを正確に集計
        authorArticlesSnapshot.forEach(doc => {
          const data = doc.data() as ArticleSummary;
          // 必ず articleScore フィールドを使用（undefinedの場合は0とする）
          scoreSum += data.articleScore || 0;
          articleCount++;
          likeCount += data.likeCount || 0;
          usefulCount += data.usefulCount || 0;
        });
        
        // 統計を更新
        authorCounts[authorId] = {
          likeCount,
          usefulCount,
          articleScoreSum: scoreSum,
          articleCount
        };
        
        // 更新された著者を記録
        updatedAuthors.push({
          authorId,
          articles: articleCount,
          totalScore: scoreSum,
          averageScore: articleCount > 0 ? Math.round((scoreSum / articleCount) * 10) / 10 : 0
        });
      } catch (error) {
        console.error(`著者 ${authorId} の統計計算エラー:`, error);
      }
    }
    
    // 著者カウンテータを完全に置き換え（マージしない）
    await setDoc(authorCountsRef, {
      counts: authorCounts,
      lastUpdated: Date.now()
    });
    
    return {
      processed: updatedAuthors.length,
      errors: 0,
      results: updatedAuthors.slice(0, 20) as AuthorStatsResult[] // 結果の一部のみ返す
    };
  }
  
  // トロフィーとバッジの再計算 - APIルートからクライアントに移行
  async function recalculateTrophiesAndBadges(): Promise<RecalculationResult> {
    // 著者の統計情報を取得
    const authorCountsRef = doc(searchDb, 'counts', 'author');
    const authorCountsDoc = await getDoc(authorCountsRef);
    
    if (!authorCountsDoc.exists()) {
      return { processed: 0, results: [], errors: 0 };
    }
    
    const authorCounts = authorCountsDoc.data().counts || {};
    const authorIds = Object.keys(authorCounts);
    
    const updatedUsers: TrophyResult[] = [];
    const userBatch = writeBatch(db);
    let errorCount = 0;
    
    // 各ユーザーのトロフィーとバッジを再計算
    for (const authorId of authorIds) {
      try {
        const authorData = authorCounts[authorId];
        
        // ユーザー統計の作成
        const userStats = {
          likeCount: authorData.likeCount || 0,
          usefulCount: authorData.usefulCount || 0,
          articleCount: authorData.articleCount || 0,
          averageScore: authorData.articleCount > 0 
            ? authorData.articleScoreSum / authorData.articleCount 
            : 0,
          totalScore: authorData.articleScoreSum || 0
        };
        
        // トロフィーとバッジを計算
        const earnedTrophies = calculateUserTrophies(userStats);
        const availableBadges = getAvailableBadges(userStats, false);
        
        // ユーザードキュメントを取得
        const userRef = doc(db, 'users', authorId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          // トロフィーIDのリストを作成
          const trophyIds = earnedTrophies.map(trophy => trophy.id);
          const badgeIds = availableBadges.map(badge => badge.id);
          
          // ユーザードキュメントを更新
          userBatch.update(userRef, {
            earnedTrophies: trophyIds,
            availableBadges: badgeIds,
            stats: userStats,
            lastUpdated: Timestamp.now()
          });
          
          // 更新されたユーザーを記録
          updatedUsers.push({
            userId: authorId,
            trophyCount: trophyIds.length,
            badgeCount: badgeIds.length,
            stats: {
              articleCount: userStats.articleCount,
              likeCount: userStats.likeCount,
              usefulCount: userStats.usefulCount,
              averageScore: Math.round(userStats.averageScore * 10) / 10
            }
          });
        }
      } catch (error) {
        console.error(`ユーザー ${authorId} のトロフィー計算エラー:`, error);
        errorCount++;
      }
    }
    
    // バッチ更新を実行
    await userBatch.commit();
    
    // トロフィー再計算の時刻を記録
    await setDoc(doc(searchDb, 'system', 'trophiesLastUpdated'), {
      timestamp: Date.now()
    });
    
    return {
      processed: updatedUsers.length,
      errors: errorCount,
      results: updatedUsers.slice(0, 20) as TrophyResult[] // 結果の一部のみ返す
    };
  }

  // ローディング中は表示しない
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div>ロード中...</div>
      </div>
    );
  }

  // 管理者でない場合は表示しない（前のuseEffectでリダイレクトされるはず）
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* ヘッダー */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <FiShield className="text-2xl text-amber-400" />
              <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
            </div>
            <p className="text-slate-300">
              Evasio-Novaの管理者機能にアクセスできます。システム全体の管理と監視を行えます。
            </p>
          </motion.div>

          {/* ダッシュボードカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <DashboardCard 
              icon={<FiUsers />}
              title="ユーザー管理"
              description="ユーザー情報の確認や編集を行います"
              linkTo="/admin/users"
            />
            <DashboardCard 
              icon={<FiFileText />}
              title="コンテンツ管理"
              description="記事、コメントなどのコンテンツを管理します"
              linkTo="/admin/content"
            />
            <DashboardCard 
              icon={<FiDatabase />}
              title="システム管理"
              description="システム設定やデータベース管理を行います"
              linkTo="/admin/system"
            />
          </div>

          {/* システムステータス */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FiDatabase className="text-xl text-blue-400" />
              <h2 className="text-xl font-bold">システムステータス</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard 
                title="記事データ" 
                lastUpdated={lastRecalculated.articles || '未計算'} 
                icon={<FiFileText className="text-blue-400" />} 
              />
              <StatusCard 
                title="トロフィー" 
                lastUpdated={lastRecalculated.trophies || '未計算'} 
                icon={<FiAward className="text-yellow-400" />} 
              />
              <StatusCard 
                title="その他データ" 
                lastUpdated={lastRecalculated.other || '未計算'} 
                icon={<FiBriefcase className="text-green-400" />} 
              />
            </div>
          </motion.div>

          {/* 再計算セクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FiRefreshCw className="text-xl text-green-400" />
              <h2 className="text-xl font-bold">データ再計算</h2>
            </div>
            
            <p className="text-slate-300 mb-6">
              システムデータの再計算を実行します。処理には時間がかかる場合があります。
              必要な機能のみ選択して実行してください。
            </p>
            
            {/* 再計算タイプ選択 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-300 mb-2">再計算タイプを選択</h3>
              <div className="flex flex-wrap gap-3">
                <RecalculationTypeButton
                  title="すべて再計算"
                  description="記事スコア、トロフィー、統計情報"
                  icon={<FiZap />}
                  type="all"
                  selected={recalculationType === 'all'}
                  onClick={() => setRecalculationType('all')}
                />
                <RecalculationTypeButton
                  title="記事スコアのみ"
                  description="すべての記事の品質スコアを再計算"
                  icon={<FiFileText />}
                  type="articles"
                  selected={recalculationType === 'articles'}
                  onClick={() => setRecalculationType('articles')}
                />
                <RecalculationTypeButton
                  title="トロフィーのみ"
                  description="ユーザーのトロフィーと獲得バッジを再計算"
                  icon={<FiAward />}
                  type="trophies"
                  selected={recalculationType === 'trophies'}
                  onClick={() => setRecalculationType('trophies')}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isRecalculating}
                onClick={handleRecalculateScores}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors
                  ${isRecalculating 
                    ? 'bg-slate-600/50 text-slate-300 cursor-not-allowed' 
                    : 'bg-green-500/80 hover:bg-green-500 text-white'}`}
              >
                {isRecalculating ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>再計算中...</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    <span>{
                      recalculationType === 'all' ? 'すべてのデータを再計算' :
                      recalculationType === 'articles' ? '記事スコアを再計算' :
                      'トロフィーを再計算'
                    }</span>
                  </>
                )}
              </motion.button>
            </div>
            
            {/* エラー表示 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FiAlertTriangle className="text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-400 mb-1">エラーが発生しました</h3>
                    <p className="text-slate-300">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 結果表示 */}
            {recalculationResult && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FiCheck className="text-green-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-400 mb-1">再計算が完了しました</h3>
                    <p className="text-slate-300">
                      {recalculationResult.processed}件の記事を処理しました。
                      {recalculationResult.errors > 0 && ` (${recalculationResult.errors}件のエラーが発生)`}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 結果の詳細 */}
            {recalculationResult?.results && recalculationResult.results.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="font-medium mb-4">再計算結果の詳細</h3>
                <div className="max-h-60 overflow-y-auto bg-slate-900/50 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          {recalculationType === 'trophies' ? 'ユーザーID' : '記事タイトル'}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {recalculationType === 'trophies' ? 'トロフィー数' : '旧スコア'}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {recalculationType === 'trophies' ? 'バッジ数' : '新スコア'}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {recalculationType === 'trophies' ? '記事数' : '変化'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {recalculationResult.results.map((result, index) => {
                        if (recalculationType === 'trophies' && isTrophyResult(result)) {
                          // トロフィー再計算の結果表示
                          return (
                            <tr key={result.userId || index} className="hover:bg-white/5">
                              <td className="px-4 py-3 truncate max-w-xs">
                                <Link 
                                  href={`/wiki/user?id=${result.userId}`}
                                  className="text-blue-400 hover:text-blue-300 truncate inline-block max-w-full"
                                >
                                  {result.userId}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">{result.trophyCount}</td>
                              <td className="px-4 py-3 text-center">{result.badgeCount}</td>
                              <td className="px-4 py-3 text-center">{result.stats.articleCount}</td>
                            </tr>
                          );
                        } else if (isArticleScoreResult(result)) {
                          // 記事スコア再計算の結果表示
                          const scoreDiff = result.newScore - result.oldScore;
                          const isImproved = scoreDiff > 0;
                          const isDecreased = scoreDiff < 0;
                          
                          return (
                            <tr key={result.id || index} className="hover:bg-white/5">
                              <td className="px-4 py-3 truncate max-w-xs">
                                <Link 
                                  href={`/wiki/view?id=${result.id}`}
                                  className="text-blue-400 hover:text-blue-300 truncate inline-block max-w-full"
                                >
                                  {result.title}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">{Math.round(result.oldScore)}</td>
                              <td className="px-4 py-3 text-center">{Math.round(result.newScore)}</td>
                              <td className={`px-4 py-3 text-center ${
                                isImproved ? 'text-green-400' : 
                                isDecreased ? 'text-red-400' : 
                                'text-slate-400'
                              }`}>
                                {isImproved && '+'}
                                {Math.round(scoreDiff * 10) / 10}
                              </td>
                            </tr>
                          );
                        } else if (isAuthorStatsResult(result)) {
                          // 著者スコア結果の表示
                          return (
                            <tr key={result.authorId || index} className="hover:bg-white/5">
                              <td className="px-4 py-3 truncate max-w-xs">
                                <Link 
                                  href={`/wiki/user?id=${result.authorId}`}
                                  className="text-blue-400 hover:text-blue-300 truncate inline-block max-w-full"
                                >
                                  {result.authorId}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">{result.articles}</td>
                              <td className="px-4 py-3 text-center">{Math.round(result.totalScore)}</td>
                              <td className="px-4 py-3 text-center">{result.averageScore.toFixed(1)}</td>
                            </tr>
                          );
                        } else {
                          return null;
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ダッシュボードカードコンポーネント
function DashboardCard({ 
  icon, 
  title, 
  description, 
  linkTo 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
}) {
  return (
    <Link href={linkTo}>
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ y: 0, scale: 0.98 }}
        className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 h-full transition-all hover:shadow-lg hover:bg-white/15"
      >
        <div className="flex justify-between items-start">
          <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
            {icon}
          </div>
          <FiChevronRight className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold mt-4 mb-2">{title}</h3>
        <p className="text-slate-300 text-sm">{description}</p>
      </motion.div>
    </Link>
  );
}

// 再計算タイプボタン
function RecalculationTypeButton({ 
  title, 
  description, 
  icon, 
  type, 
  selected, 
  onClick 
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'all' | 'articles' | 'trophies';
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
        selected 
          ? 'border-indigo-500 bg-indigo-500/20' 
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className={`p-2 rounded-full ${
        selected ? 'bg-indigo-500/30' : 'bg-white/10'
      }`}>
        {icon}
      </div>
      <div className="text-left">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
    </motion.button>
  );
}

// ステータスカード
function StatusCard({ 
  title, 
  lastUpdated, 
  icon 
}: { 
  title: string;
  lastUpdated: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 flex items-center gap-3">
      <div className="p-2 rounded-full bg-white/10">
        {icon}
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <div className="flex items-center text-sm text-slate-300">
          <FiClock className="mr-1" />
          <span>最終更新: {lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
