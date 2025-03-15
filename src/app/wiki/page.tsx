"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiSearch, FiBookmark, FiThumbsUp, FiCheckCircle } from "react-icons/fi";

// 仮のWiki記事データ（後でFirestoreから取得するように変更）
const wikiArticles = [
  {
    id: "no-cookie-youtube",
    title: "No-cookie Youtubeの使い方",
    description: "ISGCが制限するYoutubeを回避するためのno-cookie方式の解説",
    author: "ProxyMaster",
    date: "2023-05-15",
    usefulCount: 342,
    likeCount: 120,
    tags: ["youtube", "proxy", "isgc", "no-cookie"]
  },
  {
    id: "youtube-proxys",
    title: "Youtube用プロキシ一覧",
    description: "Youtubeを視聴するための最新プロキシサイト一覧と詳細な使用方法",
    author: "NetFreedom",
    date: "2023-04-22",
    usefulCount: 289,
    likeCount: 95,
    tags: ["youtube", "proxy", "video", "streaming"]
  },
  {
    id: "proxys-isgc",
    title: "ISGC/InterSafe向けプロキシ",
    description: "ISGC/InterSafeに対応したプロキシサーバーの紹介と詳細な使用方法",
    author: "SecurityBypass",
    date: "2023-03-10",
    usefulCount: 256,
    likeCount: 88,
    tags: ["isgc", "intersafe", "proxy", "school"]
  },
  {
    id: "general-proxys",
    title: "一般的なプロキシサーバー一覧",
    description: "様々な制限を回避するための汎用プロキシサーバー一覧と使い方ガイド",
    author: "FreedomTech",
    date: "2023-06-05",
    usefulCount: 201,
    likeCount: 76,
    tags: ["proxy", "vpn", "bypass", "general"]
  },
  {
    id: "school-wifi-bypass",
    title: "学校Wi-Fi制限の回避方法",
    description: "学校のWi-Fiネットワークの制限を回避するテクニック集と応用方法",
    author: "SchoolHacker",
    date: "2023-02-18",
    usefulCount: 187,
    likeCount: 65,
    tags: ["school", "wifi", "network", "bypass"]
  },
  {
    id: "school-device-unlock",
    title: "学校端末の制限解除方法",
    description: "学校から配布された端末の制限を安全に解除する方法とリスク対策",
    author: "DeviceLiberty",
    date: "2023-07-12",
    usefulCount: 175,
    likeCount: 61,
    tags: ["school", "device", "chromebook", "ipad", "mdm"]
  },
  {
    id: "parental-control-bypass",
    title: "ペアレンタルコントロールの回避方法",
    description: "家庭内のペアレンタルコントロール設定を回避するテクニックと注意点",
    author: "PrivacyDefender",
    date: "2023-01-30",
    usefulCount: 168,
    likeCount: 59,
    tags: ["parental", "control", "home", "router"]
  },
  {
    id: "home-wifi-bypass",
    title: "家庭内Wi-Fi制限の回避方法",
    description: "家庭のWi-Fiルーターに設定された制限を回避する方法とその影響",
    author: "HomeNetExpert",
    date: "2023-08-05",
    usefulCount: 156,
    likeCount: 52,
    tags: ["home", "wifi", "router", "bypass"]
  }
];

// 全てのタグを抽出
const allTags = Array.from(new Set(wikiArticles.flatMap(article => article.tags)));

export default function WikiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"usefulCount" | "likeCount" | "date">("usefulCount");
  
  // 検索とフィルター処理
  const filteredArticles = wikiArticles
    .filter(article => {
      // 検索クエリに一致
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           article.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 選択されたタグに一致
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => article.tags.includes(tag));
      
      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b[sortBy] - a[sortBy];
    });
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
          >
            Evasio Wiki
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xl text-center text-slate-300 max-w-2xl"
          >
            専門家の知識を集約し、様々な制限環境における解決策を提供します
          </motion.p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-xl border border-white/20 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="記事を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "usefulCount" | "likeCount" | "date")}
                className="bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="usefulCount">使えた！順</option>
                <option value="likeCount">いいね順</option>
                <option value="date">新着順</option>
              </select>
              
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-lg py-2 px-4 hover:bg-purple-500/30 transition-colors"
                >
                  フィルターをクリア
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-sm rounded-full py-1 px-3 transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 hover:bg-white/15 text-white/70"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </motion.div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.4, duration: 0.4 }}
              >
                <Link href={`/wiki/${article.id}`}>
                  <motion.div 
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-colors"
                  >
                    <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
                    <p className="text-slate-300 text-sm mb-4 line-clamp-2">{article.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.tags.map(tag => (
                        <span key={tag} className="text-xs bg-white/10 rounded-full px-2 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-slate-300">
                      <span className="flex items-center">
                        <FiBookmark className="mr-1" /> {article.author}
                      </span>
                      <span className="text-xs">{article.date}</span>
                    </div>
                    
                    <div className="flex justify-between mt-4 text-sm">
                      <span className="flex items-center text-green-400">
                        <FiCheckCircle className="mr-1" />
                        使えた！ {article.usefulCount}
                      </span>
                      <span className="flex items-center text-pink-400">
                        <FiThumbsUp className="mr-1" />
                        いいね {article.likeCount}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-xl text-slate-300">検索条件に一致する記事がありません</p>
            </div>
          )}
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-6 py-3 hover:bg-white/15 transition-all duration-300"
            >
              ホームに戻る
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}
