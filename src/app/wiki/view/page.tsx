import { Suspense } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import WikiArticleContent from "../../../components/WikiArticleContent";

// サーバーコンポーネントのページ
export default function WikiArticlePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  // クエリパラメータから記事IDを取得
  const articleId = searchParams.id || "";
  
  console.log(`Rendering wiki article for ID: ${articleId || 'not specified'}`);

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
            {articleId ? (
              <WikiArticleContent articleId={articleId} />
            ) : (
              <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center">
                <h2 className="text-xl font-bold text-amber-400 mb-2">記事IDが指定されていません</h2>
                <p className="text-white">適切な記事IDをクエリパラメータとして指定してください。</p>
                <p className="text-gray-400 mt-4">例: /wiki/view?id=article-123</p>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
