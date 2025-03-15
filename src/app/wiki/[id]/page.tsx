"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiThumbsUp, FiCheckCircle, FiBookmark, FiCalendar, FiMessageCircle } from "react-icons/fi";

// 仮のWiki記事データ（後でFirestoreから取得するように変更）
const wikiArticles = [
  {
    id: "no-cookie-youtube",
    title: "No-cookie Youtubeの使い方",
    content: `
# No-cookie Youtubeの使い方

ISGCやInterSafeなどのフィルタリングソフトは、一般的なYoutubeの埋め込みや視聴を制限していますが、no-cookieモードを使用することでこの制限を回避できる場合があります。

## no-cookieとは？

Youtubeのno-cookieモードは、プライバシー強化モードとも呼ばれ、クッキーを使用せずにコンテンツを表示します。教育機関などでプライバシー保護のために提供されている機能です。

## 使用方法

1. 通常のYoutubeリンク: \`https://www.youtube.com/watch?v=VIDEO_ID\`
2. no-cookieリンク: \`https://www.youtube-nocookie.com/watch?v=VIDEO_ID\`

リンクの「youtube.com」を「youtube-nocookie.com」に置き換えるだけです。

## 埋め込みの場合

iframe埋め込みの場合は、srcのURLを以下のように変更します：

\`\`\`html
<!-- 通常のYoutube埋め込み -->
<iframe src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>

<!-- no-cookieモード -->
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
\`\`\`

## 注意点

- すべてのフィルタリングソフトでこの方法が有効とは限りません。
- 学校や組織のポリシーに違反する可能性があるため、適切に使用してください。
- ISGCの最新バージョンでは、youtube-nocookie.comもブロックされることがあります。
    `,
    author: "ProxyMaster",
    date: "2023-05-15",
    usefulCount: 342,
    likeCount: 120,
    tags: ["youtube", "proxy", "isgc", "no-cookie"],
    imageUrl: "https://i.imgur.com/K9XNgIe.jpg", // Imgurの画像URL
  },
  // 他の記事データ...
];

export default function WikiArticlePage() {
  const params = useParams();
  const articleId = params.id as string;
  const [article, setArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 記事データ取得（後でFirestoreから取得するように変更）
    const fetchArticle = () => {
      setIsLoading(true);
      try {
        const foundArticle = wikiArticles.find(a => a.id === articleId);
        setArticle(foundArticle || null);
      } catch (error) {
        console.error("記事の取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex flex-col justify-center items-center">
        <div className="text-2xl mb-4">記事が見つかりません</div>
        <Link href="/wiki">
          <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
            Wikiに戻る
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/wiki">
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8"
            >
              <FiArrowLeft className="mr-2" /> Wiki一覧に戻る
            </motion.button>
          </Link>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
          >
            {/* ヘッダー部分 */}
            <div className="p-6 sm:p-8 border-b border-white/10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">{article.title}</h1>
              
              <div className="flex flex-wrap items-center text-sm text-slate-300 gap-4 mb-6">
                <div className="flex items-center">
                  <FiBookmark className="mr-1" /> {article.author}
                </div>
                <div className="flex items-center">
                  <FiCalendar className="mr-1" /> {article.date}
                </div>
                <div className="flex items-center text-green-400">
                  <FiCheckCircle className="mr-1" /> 使えた！ {article.usefulCount}
                </div>
                <div className="flex items-center text-pink-400">
                  <FiThumbsUp className="mr-1" /> いいね {article.likeCount}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span 
                    key={tag} 
                    className="bg-white/10 text-xs rounded-full px-3 py-1"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 記事本文 */}
            <div className="p-6 sm:p-8">
              {/* 記事に画像があれば表示 */}
              {article.imageUrl && (
                <div className="mb-6">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              
              {/* Markdownコンテンツ (ここでは簡易的に整形) */}
              <div className="prose prose-invert max-w-none">
                {article.content.split('\n').map((paragraph: string, i: number) => {
                  if (paragraph.startsWith('# ')) {
                    return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{paragraph.replace('# ', '')}</h1>;
                  }
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{paragraph.replace('## ', '')}</h2>;
                  }
                  if (paragraph.startsWith('```')) {
                    return null; // コードブロックは単純なパラグラフ置換では処理できないので省略
                  }
                  return paragraph ? <p key={i} className="my-3">{paragraph}</p> : <br key={i} />;
                })}
              </div>
              
              {/* アクションボタン */}
              <div className="mt-12 flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                >
                  <FiCheckCircle className="mr-2" /> 使えた！
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                >
                  <FiThumbsUp className="mr-2" /> いいね
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/15 transition-all duration-300 flex items-center justify-center"
                >
                  <FiMessageCircle className="mr-2" /> コメント
                </motion.button>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </div>
  );
}
