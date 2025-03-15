import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import WikiArticleContent from "../../../components/WikiArticleContent";
import { db } from "../../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

// 静的ページを生成するための情報を提供する関数
export async function generateStaticParams() {
  try {
    // 静的に生成するページのIDパラメータを返す
    // 本番環境ではFirestoreからすべての記事IDを取得
    if (process.env.NODE_ENV === 'production') {
      const articlesRef = collection(db, "wikiArticles");
      const querySnapshot = await getDocs(articlesRef);
      return querySnapshot.docs.map(doc => ({ id: doc.id }));
    }
    
    // 開発環境では空の配列を返す（サーバーサイドでの静的生成をスキップ）
    return [];
  } catch (error) {
    console.error("Generate static params error:", error);
    return [];
  }
}

// サーバーコンポーネントのページ
export default function WikiArticlePage({ params }: { params: { id: string } }) {
  const articleId = params.id;

  // ページコンポーネント自体はシンプルにして、詳細はクライアントコンポーネントに任せる
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/wiki">
            <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8">
              <FiArrowLeft className="mr-2" /> Wiki一覧に戻る
            </div>
          </Link>

          <Suspense fallback={<div className="text-center py-12">読み込み中...</div>}>
            {/* クライアントコンポーネントとしてWikiArticleContentを呼び出す */}
            <WikiArticleContent articleId={articleId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
