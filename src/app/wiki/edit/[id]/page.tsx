import { Suspense } from "react";
import EditWikiPageClient from "../../../../components/EditWikiPageClient";

// 静的ページを生成するためのパラメータを提供
export async function generateStaticParams() {
  // 空の配列を返すだけでもOK - 静的ビルド時にダイナミックルートを生成しない
  return [
    { id: "placeholder" } // ビルド時にプレースホルダーページを1つ生成
  ];
}
// /app/wiki/user/[id]/page.tsx など
export const dynamicParams = true; // または false
// サーバーコンポーネントとして、クライアントコンポーネントをラップする
export default function EditWikiPage({ params }: { params: { id: string } }) {
  const articleId = params.id;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center"><div className="text-xl">読み込み中...</div></div>}>
      <EditWikiPageClient articleId={articleId} />
    </Suspense>
  );
}
