import { Suspense } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import WikiArticleContent from "../../../components/WikiArticleContent";

// サーバーコンポーネントのページ - searchParamsを使わないよう修正
export default function WikiArticlePage() {
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
            <WikiArticleContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
