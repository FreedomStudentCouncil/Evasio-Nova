"use client";
import Link from 'next/link';
import { FiAlertTriangle, FiHome } from 'react-icons/fi';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md w-full text-center">
        <FiAlertTriangle className="mx-auto text-7xl text-yellow-400 mb-4" />
        <h1 className="text-3xl font-bold mb-3">ページが見つかりません</h1>
        <p className="text-slate-300 mb-6">
          お探しのページが存在しないか、移動または削除された可能性があります。
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors flex items-center justify-center w-full">
              <FiHome className="mr-2" /> ホームに戻る
            </button>
          </Link>
          
          <Link href="/wiki">
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition-colors flex items-center justify-center w-full">
              Wiki一覧を見る
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
