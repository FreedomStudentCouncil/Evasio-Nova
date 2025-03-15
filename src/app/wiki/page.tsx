"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiSearch, FiBookmark, FiThumbsUp, FiCheckCircle, FiEdit } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase/config";
import { getAllArticles, WikiArticle } from "../../firebase/wiki";

export default function WikiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"usefulCount" | "likeCount" | "date">("usefulCount");
  const { user } = useAuth();
  const [wikiArticles, setWikiArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  // Firestoreからデータを取得
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        // Firestoreから記事データを取得
        const articles = await getAllArticles(sortBy);
        setWikiArticles(articles);
        
        // 全てのタグを抽出して一意の配列にする
        setAllTags(Array.from(new Set(articles.flatMap(article => article.tags || []))));
      } catch (error) {
        console.error("記事の取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [sortBy]); // sortByが変更されたときに再取得
  
  // 検索とフィルター処理
  const filteredArticles = wikiArticles
    .filter(article => {
      // 検索クエリに一致
      const matchesSearch = 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (article.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
      // 選択されたタグに一致
      const matchesTags = selectedTags.length === 0 || 
                         (article.tags && selectedTags.every(tag => article.tags.includes(tag)));
      
      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        // 日付型とタイムスタンプの両方に対応
        const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date?.toDate();
        const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date?.toDate();
        
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // ソート方法変更時の処理
  const handleSortChange = (newSortBy: "usefulCount" | "likeCount" | "date") => {
    setSortBy(newSortBy);
    // サーバーから再取得する場合はコメント解除
    // setLoading(true);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }
  
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
            className="text-xl text-center text-slate-300 max-w-2xl mb-6"
          >
            専門家の知識を集約し、様々な制限環境における解決策を提供します
          </motion.p>
          
          {user && (
            <Link href="/wiki/create">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 rounded-full font-medium shadow-lg"
              >
                <FiEdit className="mr-2" /> 新しい記事を作成
              </motion.button>
            </Link>
          )}
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
                onChange={(e) => handleSortChange(e.target.value as "usefulCount" | "likeCount" | "date")}
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
                    
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags.map(tag => (
                          <span key={tag} className="text-xs bg-white/10 rounded-full px-2 py-1">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-sm text-slate-300">
                      <span className="flex items-center">
                        <FiBookmark className="mr-1" /> {article.author}
                      </span>
                      <span className="text-xs">
                        {typeof article.date === 'string' 
                          ? article.date 
                          : article.date?.toDate().toLocaleDateString('ja-JP') || '日付なし'}
                      </span>
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
