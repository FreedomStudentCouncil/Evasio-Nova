"use client";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

// Wikiの記事データ型定義
interface WikiArticle {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  usefulCount: number;
  // 他の必要なフィールド
}

export default function WikiArticleContent({
  articleId,
}: {
  articleId: string;
}) {
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      
      // 記事IDが空の場合はエラーを設定
      if (!articleId) {
        setError("記事IDが指定されていません");
        setLoading(false);
        return;
      }
      
      try {
        const docRef = doc(db, "wikiArticles", articleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<WikiArticle, "id">;
          setArticle({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Date 
              ? data.createdAt 
              : new Date((data.createdAt as { seconds: number }).seconds * 1000),
            updatedAt: data.updatedAt instanceof Date 
              ? data.updatedAt 
              : new Date((data.updatedAt as { seconds: number }).seconds * 1000)
          });
        } else {
          setError("記事が見つかりませんでした");
        }
      } catch (err) {
        console.error("記事の取得エラー:", err);
        setError(err instanceof Error ? err.message : "記事の読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    
    fetchArticle();
  }, [articleId]);
  
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-blue-400">記事を読み込み中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">エラー</h2>
        <p className="text-white">{error}</p>
      </div>
    );
  }
  
  if (!article) {
    return (
      <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2">記事が見つかりません</h2>
        <p className="text-white">指定された記事は存在しないか、削除された可能性があります。</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
      
      <div className="flex justify-between text-sm text-gray-400 mb-6">
        <div>
          作成者: {article.authorName || "不明なユーザー"}
        </div>
        <div>
          更新日: {article.updatedAt.toLocaleDateString()}
        </div>
      </div>
      
      <div className="prose prose-invert max-w-none">
        {/* このコンテンツは実際にはMarkdownやリッチテキストなどで表示 */}
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>
      
      <div className="mt-8 flex items-center justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition">
          <span>役に立った</span>
          <span className="bg-blue-800 px-2 py-0.5 rounded-full text-sm">
            {article.usefulCount || 0}
          </span>
        </button>
      </div>
    </div>
  );
}
