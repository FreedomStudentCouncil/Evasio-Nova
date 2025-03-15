"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiCheckCircle, FiHeart } from "react-icons/fi";

// 仮の人気記事データ（後でFirestoreから取得するように変更予定）
const popularArticles = [
  { id: "1", title: "学校のISGC制限を回避する方法", usefulCount: 342, likeCount: 120 },
  { id: "2", title: "InterSafeがブロックしないYoutubeプロキシ一覧", usefulCount: 289, likeCount: 95 },
  { id: "3", title: "家庭用ペアレンタルコントロールの解除法", usefulCount: 256, likeCount: 88 },
  { id: "4", title: "ブラウザ拡張機能を無効化せずに制限を回避する方法", usefulCount: 201, likeCount: 76 },
  { id: "5", title: "最新のプロキシサーバー一覧 2023年版", usefulCount: 187, likeCount: 65 },
];

export default function Home() {
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
                <Link href={`/wiki/${article.id}`}>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 h-full hover:bg-white/15 transition-all duration-300">
                    <h3 className="text-xl font-semibold mb-4">{article.title}</h3>
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
        </motion.div>
      </section>
      
      {/* フッター */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>© 2023 Evasio-Nova. All rights reserved.</p>
      </footer>
    </div>
  );
}
