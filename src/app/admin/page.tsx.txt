"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiShield, FiAlertTriangle, FiUsers, FiFileText, FiThumbsDown, FiEye, FiTrash2, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { getHighlyDislikedArticles, resetDislikeCount } from "../../firebase/admin";
import { WikiArticle } from "../../types/wiki";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [dislikedArticles, setDislikedArticles] = useState<WikiArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 管理者権限のチェックと低評価の多い記事を取得
  useEffect(() => {
    const fetchData = async () => {
      if (loading) return;
      
      if (!user || !isAdmin) {
        router.push("/");
        return;
      }
      
      try {
        const articles = await getHighlyDislikedArticles(20);
        setDislikedArticles(articles);
      } catch (error) {
        console.error("低評価記事の取得に失敗:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, isAdmin, loading, router]);
  
  const handleResetDislike = async (articleId: string) => {
    try {
      await resetDislikeCount(articleId);
      // 記事一覧を更新
      setDislikedArticles(prev => 
        prev.map(article => 
          article.id === articleId 
            ? { ...article, dislikeCount: 0 } 
            : article
        )
      );
    } catch (error) {
      console.error("低評価のリセットに失敗:", error);
    }
  };
  
  // ローディング中
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }
  
  // 管理者でない場合
  if (!isAdmin) {
    return null; // router.pushの実行を待つためnullを返す
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <FiShield className="text-3xl text-amber-400 mr-3" />
              <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
            </div>
            <Link href="/">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                ホームに戻る
              </button>
            </Link>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6"
            >
              <div className="flex items-center mb-2">
                <FiUsers className="text-2xl text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold">ユーザー管理</h3>
              </div>
              <p className="text-slate-300 mb-4">ユーザー情報の確認、権限管理を行います</p>
              <button className="w-full py-2 bg-blue-500/30 hover:bg-blue-500/40 rounded-lg transition-colors">
                準備中
              </button>
            </motion.div>
            
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-green-500/20 border border-green-500/30 rounded-xl p-6"
            >
              <div className="flex items-center mb-2">
                <FiFileText className="text-2xl text-green-400 mr-2" />
                <h3 className="text-xl font-semibold">記事管理</h3>
              </div>
              <p className="text-slate-300 mb-4">記事の一覧や統計情報を確認できます</p>
              <Link href="/wiki">
                <button className="w-full py-2 bg-green-500/30 hover:bg-green-500/40 rounded-lg transition-colors">
                  Wiki一覧へ
                </button>
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-6"
            >
              <div className="flex items-center mb-2">
                <FiAlertTriangle className="text-2xl text-red-400 mr-2" />
                <h3 className="text-xl font-semibold">低評価記事</h3>
              </div>
              <p className="text-slate-300 mb-4">低評価の多い記事を確認・対応します</p>
              <button className="w-full py-2 bg-red-500/30 hover:bg-red-500/40 rounded-lg transition-colors" onClick={() => window.scrollTo(0, document.body.scrollHeight)}>
                下部へスクロール
              </button>
            </motion.div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center">
                <FiThumbsDown className="text-xl text-red-400 mr-2" />
                <h2 className="text-xl font-semibold">低評価の多い記事</h2>
              </div>
              <p className="text-slate-300 mt-1">問題のある内容の記事を確認し、必要に応じて編集・削除してください</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-4 text-left">タイトル</th>
                    <th className="p-4 text-left">作成者</th>
                    <th className="p-4 text-center">低評価数</th>
                    <th className="p-4 text-center">評価値</th>
                    <th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dislikedArticles.length > 0 ? (
                    dislikedArticles.map(article => (
                      <tr key={article.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="p-4">
                          <Link href={`/wiki/view?id=${article.id}`}>
                            <span className="text-blue-400 hover:underline">{article.title}</span>
                          </Link>
                        </td>
                        <td className="p-4">{article.author}</td>
                        <td className="p-4 text-center">
                          <span className="inline-block bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                            {article.dislikeCount || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                            {article.articleScore || 0}/100
                          </span>
                        </td>
                        <td className="p-4 flex justify-center gap-2">
                          <Link href={`/wiki/view?id=${article.id}`}>
                            <button className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                              <FiEye />
                            </button>
                          </Link>
                          <Link href={`/wiki/edit?id=${article.id}`}>
                            <button className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
                              <FiShield />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleResetDislike(article.id!)}
                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          >
                            <FiRefreshCw />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        低評価の記事はありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
