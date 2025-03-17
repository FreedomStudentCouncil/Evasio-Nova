"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

export default function WikiNotFound() {
  const router = useRouter();

  useEffect(() => {
    // 本番環境では、ページが見つからない場合にフォールバックページを試す
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const pathSegments = path.split('/').filter(Boolean);
      
      if (pathSegments[0] === 'wiki') {
        // wiki関連のパスならフォールバックページにリダイレクト
        router.replace('/wiki/fallback');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/wiki">
            <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8">
              <FiArrowLeft className="mr-2" /> Wiki一覧に戻る
            </div>
          </Link>

          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 text-center">
            <FiAlertTriangle className="mx-auto text-5xl text-yellow-400 mb-4" />
            <h1 className="text-2xl font-bold mb-2">ページが見つかりません</h1>
            <p className="mb-6">お探しのページは存在しないか、移動した可能性があります。</p>
            <div className="animate-pulse text-blue-400">リダイレクト中...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
