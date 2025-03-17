"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

export default function WikiFallback() {
  const router = useRouter();
  const [path, setPath] = useState<string>('');

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      // 現在のパスを取得
      setPath(window.location.pathname);
      
      // パスの形式によってリダイレクト
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      
      if (pathSegments[0] === 'wiki') {
        if (pathSegments.length === 3 && pathSegments[1] === 'view') {
          // wiki/view/[id] の形式
          const articleId = pathSegments[2];
          router.replace(`/wiki/view/${articleId}`);
        } else if (pathSegments.length >= 3 && pathSegments[1] === 'user') {
          // wiki/user/[id] の形式
          const userId = pathSegments[2];
          router.replace(`/wiki/user/${userId}`);
        } else if (pathSegments.length === 2) {
          // 古い形式 wiki/[id] の場合は新形式にリダイレクト
          const articleId = pathSegments[1];
          if (articleId !== 'fallback' && articleId !== 'user') {
            router.replace(`/wiki/view/${articleId}`);
          } else {
            router.replace('/wiki');
          }
        }
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
            <h1 className="text-2xl font-bold mb-2">ページを読み込んでいます</h1>
            <p className="mb-6">リダイレクトしています。しばらくお待ちください。</p>
            <div className="animate-pulse text-blue-400">処理中...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
