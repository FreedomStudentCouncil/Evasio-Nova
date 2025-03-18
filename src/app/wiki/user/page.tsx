import { Suspense } from "react";
import UserProfilePageClient from "../../../components/UserProfilePageClient";

// サーバーコンポーネントとして、クライアントコンポーネントをラップする
export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center"><div className="text-xl">読み込み中...</div></div>}>
      <UserProfilePageClient />
    </Suspense>
  );
}
