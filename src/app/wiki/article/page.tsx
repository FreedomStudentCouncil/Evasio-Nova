'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import WikiArticleContent from "../../../components/WikiArticleContent";
import WikiComments from "../../../components/WikiComments";
import { useAuth } from "../../../context/AuthContext";
import { getArticleById } from "../../../firebase/wiki";
import { WikiArticle } from "../../../types/wiki";

export default function WikiArticlePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const articleId = searchParams.get('id') || '';
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticle() {
      if (!articleId) return;
      
      try {
        const articleData = await getArticleById(articleId);
        setArticle(articleData);
      } catch (error) {
        console.error("記事の読み込みに失敗:", error);
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [articleId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/wiki">
            <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8">
              <FiArrowLeft className="mr-2" /> Wiki一覧に戻る
            </div>
          </Link>

          {loading ? (
            <div className="text-center py-12">読み込み中...</div>
          ) : (
            <>
              <WikiArticleContent />
              
              {article && (
                <WikiComments 
                  articleId={article.id || articleId} 
                  user={user} 
                  articleTitle={article.title || ""}
                  articleAuthorId={article.authorId || ""}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}