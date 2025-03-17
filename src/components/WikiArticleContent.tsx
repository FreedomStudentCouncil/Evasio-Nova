"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Wikiの記事コンテンツを表示するクライアントコンポーネント
export default function WikiArticleContent({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 記事IDに基づいてデータをフェッチ
    async function fetchArticle() {
      setLoading(true);
      try {
        // Firebaseから直接記事データを取得
        const docRef = doc(db, "wikiArticles", articleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // ドキュメント存在時
          const data = {
            id: docSnap.id,
            ...docSnap.data(),
            // 日付形式の変換処理（必要に応じて）
            updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date()
          };
          setArticle(data);
          setError(null);
        } else {
          // ドキュメントが存在しない場合
          throw new Error("記事が見つかりませんでした");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("記事の読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [articleId]);

  if (loading) {
    return <div className="py-8 text-center">記事を読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
          {error}
        </div>
        <button 
          onClick={() => router.back()} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          戻る
        </button>
      </div>
    );
  }

  if (!article) {
    return <div className="py-8 text-center">記事が見つかりません</div>;
  }

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <h1>{article.title}</h1>
      <div className="mb-6">
        <span className="text-blue-400">最終更新: {new Date(article.updatedAt).toLocaleDateString()}</span>
      </div>
      
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
