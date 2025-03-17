import { redirect } from 'next/navigation';

// 静的ページを生成するための情報を提供する関数
export async function generateStaticParams() {
  // リダイレクト用の基本パラメータのみ
  return [
    { id: "placeholder" }
  ];
}

// サーバーコンポーネントとして、リダイレクトのみを行う
export default async function WikiLegacyArticlePage({ params }: { params: { id: string } }) {
  // 新しいパス形式にリダイレクト
  const resolvedParams = await Promise.resolve(params);
  const articleId = resolvedParams.id;
  
  // 新URLフォーマットへリダイレクト
  redirect(`/wiki/view/${articleId}`);
}
