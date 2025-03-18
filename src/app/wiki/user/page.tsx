import { Suspense } from "react";
import UserProfilePageClient from "../../../components/UserProfilePageClient";

// サーバーコンポーネントとして、クライアントコンポーネントをラップする
export default function UserProfilePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  // クエリパラメータからユーザーIDを取得
  const userId = searchParams.id || "";
  
  console.log(`Rendering user profile for ID: ${userId || 'not specified'}`);

  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center"><div className="text-xl">読み込み中...</div></div>}>
      {userId ? (
        <UserProfilePageClient userId={userId} />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
          <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center max-w-lg">
            <h2 className="text-xl font-bold text-amber-400 mb-2">ユーザーIDが指定されていません</h2>
            <p className="text-white">適切なユーザーIDをクエリパラメータとして指定してください。</p>
            <p className="text-gray-400 mt-4">例: /wiki/user?id=user-123</p>
          </div>
        </div>
      )}
    </Suspense>
  );
}
