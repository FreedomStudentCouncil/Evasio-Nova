import { Suspense } from "react";
import EditWikiPageClient from "../../../components/EditWikiPageClient";

// サーバーコンポーネントとして、クライアントコンポーネントをラップする
export default function EditWikiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center"><div className="text-xl">読み込み中...</div></div>}>
      <EditWikiPageClient />
    </Suspense>
  );
}
