"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export default function WikiFallback() {
  const router = useRouter();
  
  useEffect(() => {
    // 単純にWikiホームにリダイレクト
    router.replace('/wiki');
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
            <h1 className="text-2xl font-bold mb-2">リダイレクトしています</h1>
            <p className="mb-6">Wiki一覧ページに移動します。</p>
            <div className="animate-pulse text-blue-400">処理中...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
