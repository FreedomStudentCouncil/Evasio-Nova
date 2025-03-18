"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiCheckCircle, FiHeart, FiArrowRight, FiLayers } from "react-icons/fi";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

// 型定義
interface Article {
  id: string;
  title: string;
  usefulCount: number;
  likeCount: number;
  description?: string;
  createdAt?: Date;
}

export default function Home() {
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Firebaseから人気記事を取得
  useEffect(() => {
    async function fetchPopularArticles() {
      try {
        const articlesRef = collection(db, "wikiArticles");
        const q = query(
          articlesRef, 
          orderBy("usefulCount", "desc"), 
          limit(6)
        );

        const snapshot = await getDocs(q);
        const articles: Article[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "無題の記事",
            usefulCount: data.usefulCount || 0,
            likeCount: data.likeCount || 0,
            description: data.description || "",
            createdAt: data.createdAt?.toDate?.() || new Date()
          };
        });
        
        setPopularArticles(articles);
      } catch (error) {
        console.error("人気記事の取得エラー:", error);
        // エラー時はダミーデータを表示
        setPopularArticles([
          { id: "1", title: "学校のISGC制限を回避する方法", usefulCount: 342, likeCount: 120 },
          { id: "2", title: "InterSafeがブロックしないYoutubeプロキシ一覧", usefulCount: 289, likeCount: 95 },
          { id: "3", title: "家庭用ペアレンタルコントロールの解除法", usefulCount: 256, likeCount: 88 },
          { id: "4", title: "ブラウザ拡張機能を無効化せずに制限を回避する方法", usefulCount: 201, likeCount: 76 },
          { id: "5", title: "最新のプロキシサーバー一覧 2023年版", usefulCount: 187, likeCount: 65 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchPopularArticles();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      {/* ヘッダーセクション */}
      <section className="relative h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Evasio-Nova
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl">
            ネットやデバイス制限環境の中にある諸君に知恵を授けます。
          </p>
          <p className="text-base md:text-lg mb-12 max-w-2xl mx-auto text-slate-300">
            Evasio-Novaは、専門家の知識を集約し、あらゆるネット制限の状況に合わせた
            最適なソリューションを提供するプラットフォームです。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/evado">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ＜クイック診断＞(evado)
              </motion.button>
            </Link>
            <Link href="/wiki">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-all duration-300"
              >
                Wiki記事を見る
              </motion.button>
            </Link>
          </div>
        </motion.div>
        
        {/* 装飾的な背景要素 */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl"></div>
        </div>
        
        {/* スクロールダウンインジケーター */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <FiArrowRight className="text-white/60 text-2xl transform rotate-90" />
        </motion.div>
      </section>

      {/* 人気記事セクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">人気記事</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-slate-300">記事を読み込み中...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {popularArticles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Link href={`/wiki/view?id=${article.id}`}>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 h-full hover:bg-white/15 transition-all duration-300">
                      <h3 className="text-xl font-semibold mb-4">{article.title}</h3>
                      {article.description && (
                        <p className="text-sm text-slate-300 mb-4 line-clamp-2">{article.description}</p>
                      )}
                      <div className="flex justify-between text-sm text-slate-300">
                        <span className="flex items-center">
                          <FiCheckCircle className="mr-1 text-green-400" />
                          使えた！ {article.usefulCount}
                        </span>
                        <span className="flex items-center">
                          <FiHeart className="mr-1 text-pink-400" />
                          いいね {article.likeCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link href="/wiki">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg inline-flex items-center text-white hover:bg-white/20 transition-all duration-300"
              >
                すべての記事を見る <FiArrowRight className="ml-2" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>
      
      {/* 特徴セクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-3xl my-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-16 text-center">Evasio-Novaの特徴</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <FiLayers className="text-blue-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">幅広い知識ベース</h3>
              <p className="text-slate-300">
                様々な制限環境に対するソリューションを網羅した、実践的な知識を提供します。
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <FiCheckCircle className="text-purple-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">実績ベースの解決法</h3>
              <p className="text-slate-300">
                実際に効果があったと報告されたソリューションを優先して紹介します。
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10"
            >
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-4">
                <FiHeart className="text-pink-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold mb-3">コミュニティ主導</h3>
              <p className="text-slate-300">
                ユーザーからのフィードバックを元に、常に最新かつ有効な情報を更新し続けています。
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>
      
      {/* フッター */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-white/10">
        <p>© {new Date().getFullYear()} Evasio-Nova. All rights reserved.</p>
      </footer>
    </div>
  );
}
