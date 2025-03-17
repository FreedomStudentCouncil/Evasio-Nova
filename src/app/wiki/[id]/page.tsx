import { Suspense } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import WikiArticleContent from "../../../components/WikiArticleContent";
import { generateStaticWikiParams } from "../staticParams";

// 静的ページを生成するための情報を提供する関数
export async function generateStaticParams() {
  return generateStaticWikiParams();
}
// /app/wiki/user/[id]/page.tsx など
export const dynamicParams = true; // または false
// サーバーコンポーネントのページ（非同期関数として宣言）
export default async function WikiArticlePage({ params }: { params: { id: string } }) {
  // paramsを確実に解決してから使用
  const resolvedParams = await Promise.resolve(params);
  const articleId = resolvedParams.id;

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
