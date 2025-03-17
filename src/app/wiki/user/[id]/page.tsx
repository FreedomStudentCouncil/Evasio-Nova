// サーバーコンポーネントに変換
import { Suspense } from "react";
import UserProfilePageClient from "../../../../components/UserProfilePageClient";
import { generateStaticUserParams } from "../../staticParams";

// 静的ページを生成するためのパラメータを提供
export async function generateStaticParams() {
  console.log("Generating static user profile params...");
  const params = await generateStaticUserParams();
  console.log("User profile static params:", params);
  return params;
}

// 静的エクスポートでは dynamicParams: true は使用できない
// export const dynamicParams = true;

// サーバーコンポーネントとして、クライアントコンポーネントをラップする
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  // paramsを確実に解決してから使用
  const resolvedParams = await Promise.resolve(params);
  const userId = resolvedParams.id;
  
  console.log(`Rendering user profile for: ${userId}`);

  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center"><div className="text-xl">読み込み中...</div></div>}>
      <UserProfilePageClient userId={userId} />
    </Suspense>
  );
}
