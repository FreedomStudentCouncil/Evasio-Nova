'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { getArticleById, getArticleCountById } from '../../../firebase/wiki';
import WikiArticleContent from '../../../components/WikiArticleContent';
import { WikiArticle } from '../../../types/wiki';

export default function WikiViewPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // メインDBから記事データを取得
        const articleData = await getArticleById(id);
        
        if (!articleData) {
          setError('記事が見つかりませんでした');
          setLoading(false);
          return;
        }
        
        // searchDBから最新の評価データを取得
        const counts = await getArticleCountById(id);
        
        // 記事データに最新の評価カウントを上書き
        const articleWithCounts = {
          ...articleData,
          id: articleData.id || id,
          likeCount: counts.likeCount,
          usefulCount: counts.usefulCount,
          dislikeCount: counts.dislikeCount
        };
        
        setArticle(articleWithCounts);
      } catch (error) {
        console.error('記事取得エラー:', error);
        setError('記事の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    fetchArticle();
  }, [id]);

  if (!id) {
    return notFound();
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>記事を読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
          <p>{error || '記事の読み込み中にエラーが発生しました。もう一度お試しください。'}</p>
        </div>
      </div>
    );
  }
  
  return <WikiArticleContent />;
}
