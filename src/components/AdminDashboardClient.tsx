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

// 結果の型定義を追加
interface RecalculationResult {
  success: boolean;
  processed: number;
  errors: number;
  results: Array<{
    id: string;
    title: string;
    oldScore: number;
    newScore: number;
  }>;
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
        const response = await fetch('/api/admin/get-last-updated', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getIdToken()}`,
            'User-Id': user?.uid || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLastRecalculated(data.lastUpdated || {});
        }
      } catch (error) {
        console.error('最終更新時刻の取得に失敗:', error);
      }
    };
    
    if (user && isAdmin) {
      fetchLastUpdated();
    }
  }, [user, isAdmin, getIdToken]);

  // スコア再計算処理
  const handleRecalculateScores = async () => {
    if (isRecalculating) return;
    
    setIsRecalculating(true);
    setRecalculationResult(null);
    setError(null);
    
    try {
      // 認証トークンを取得
      const token = await getIdToken();
      if (!token) {
        throw new Error('認証トークンを取得できませんでした');
      }
      
      // APIエンドポイントを決定
      let endpoint = '/api/admin/recalculate-scores';
      if (recalculationType === 'trophies') {
        endpoint = '/api/admin/recalculate-trophies';
      } else if (recalculationType === 'all') {
        endpoint = '/api/admin/recalculate-all';
      }
      
      // APIにリクエスト
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Id': user?.uid || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '再計算中にエラーが発生しました');
      }
      
      const result = await response.json();
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
                        <th className="px-4 py-3 text-left font-medium">記事タイトル</th>
                        <th className="px-4 py-3 text-center font-medium">旧スコア</th>
                        <th className="px-4 py-3 text-center font-medium">新スコア</th>
                        <th className="px-4 py-3 text-center font-medium">変化</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {recalculationResult.results.map((result: any) => {
                        const scoreDiff = result.newScore - result.oldScore;
                        const isImproved = scoreDiff > 0;
                        const isDecreased = scoreDiff < 0;
                        const isUnchanged = scoreDiff === 0;
                        
                        return (
                          <tr key={result.id} className="hover:bg-white/5">
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
