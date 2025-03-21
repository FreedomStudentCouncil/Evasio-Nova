"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiSearch, FiThumbsUp, FiCheckCircle, FiEdit, FiUser, FiRefreshCw } from "react-icons/fi"; // FiBookmarkをFiUserに置き換え
import { useAuth } from "../../context/AuthContext";
import { getAllArticles, WikiArticle, getArticleById, getAllArticleSummaries } from "../../firebase/wiki";
import { getUserProfile } from "../../firebase/user";
import { cacheManager } from "../../utils/cacheManager";
import { ArticleSummary } from "../../types/wiki";
import { BadgeIcon } from "../../components/BadgeIcon"; // バッジアイコンコンポーネントをインポート
import { allBadges } from "../../utils/trophies"; // バッジデータをインポート

export default function WikiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"articleScore" | "usefulCount" | "likeCount" | "date">("articleScore");
  const { user, isAdmin } = useAuth(); // isAdmin を追加
  const [wikiArticles, setWikiArticles] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: { 
    profileImage?: string | null,
    selectedBadge?: string | null  // selectedBadgeプロパティを追加
  }}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 12;
  
  // ユーザープロフィールを取得する関数
  const fetchUserProfile = async (userId: string) => {
    if (!userId || userProfiles[userId]) return;
    
    try {
      // まずキャッシュからプロフィールを取得
      let profile = await cacheManager.getUserProfile(userId);
      
      // キャッシュにない場合はFirestoreから取得
      if (!profile) {
        profile = await getUserProfile(userId);
        if (profile) {
          // キャッシュに保存
          await cacheManager.saveUserProfile(profile);
        }
      }

      if (profile) {
        setUserProfiles(prev => ({
          ...prev,
          [userId]: {
            profileImage: profile.profileImage,
            selectedBadge: profile.selectedBadge
          }
        }));
      }
    } catch (error) {
      console.error("ユーザープロフィールの取得に失敗:", error);
    }
  };

  // Firestoreからデータを取得（キャッシュを最大限活用）
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        
        // まずキャッシュからデータを取得を試みる
        try {
          const cachedSummaries = await cacheManager.getArticleSummaries();
          
          if (cachedSummaries.length > 0) {
            // キャッシュされた記事概要を直接使用
            const articles = cachedSummaries.map(summary => ({
              id: summary.id,
              title: summary.title,
              description: summary.description,
              content: '', // 記事概要にはcontentは含まれていないので空文字を設定
              tags: summary.tags,
              author: summary.author,
              authorId: summary.authorId,
              imageUrl: summary.imageUrl,
              date: summary.date,
              lastUpdated: summary.lastUpdated,
              usefulCount: summary.usefulCount,
              likeCount: summary.likeCount,
              articleScore: summary.articleScore
            } as WikiArticle));
            
            setWikiArticles(articles);
            setAllTags(Array.from(new Set(articles.flatMap(article => article.tags || []))));
            
            // キャッシュからデータを取得できた場合は処理を終了
            console.log("キャッシュから記事を使用しました");
            setLoading(false);
            
            // 著者のプロフィールも取得しておく
            const authorIds = new Set(articles.map(article => article.authorId).filter(Boolean));
            for (const userId of authorIds) {
              await fetchUserProfile(userId as string);
            }
            
            return;
          }
        } catch (cacheError) {
          console.warn("キャッシュの読み込みに失敗:", cacheError);
        }

        // キャッシュがない場合やエラーの場合はsearchDBから取得
        console.log(`searchDBから記事を取得: sortBy=${sortBy}`);
        const summaries = await getAllArticleSummaries(sortBy);
        const articles = summaries.map(summary => ({
          id: summary.id,
          title: summary.title,
          description: summary.description,
          content: '', // 記事概要にはcontentは含まれていないので空文字を設定
          tags: summary.tags,
          author: summary.author,
          authorId: summary.authorId,
          imageUrl: summary.imageUrl,
          date: summary.date,
          lastUpdated: summary.lastUpdated,
          usefulCount: summary.usefulCount,
          likeCount: summary.likeCount,
          articleScore: summary.articleScore
        } as WikiArticle));
        
        setWikiArticles(articles);
        setAllTags(Array.from(new Set(articles.flatMap(article => article.tags || []))));
        
        // キャッシュを更新
        await cacheManager.saveArticleSummaries(summaries);
        
        // 著者のプロフィールを取得
        const authorIds = new Set(articles.map(article => article.authorId).filter(Boolean));
        for (const userId of authorIds) {
          await fetchUserProfile(userId as string);
        }
      } catch (error) {
        console.error("記事の取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [sortBy]);

  // キャッシュをクリアして再取得する関数
  const handleClearCache = async () => {
    try {
      setLoading(true);
      await cacheManager.clearCache();
      
      // searchDBから最新のデータを取得
      const summaries = await getAllArticleSummaries(sortBy);
      const articles = summaries.map(summary => ({
        id: summary.id,
        title: summary.title,
        description: summary.description,
        content: '', // 記事概要にはcontentは含まれていないので空文字を設定
        tags: summary.tags,
        author: summary.author,
        authorId: summary.authorId,
        imageUrl: summary.imageUrl,
        date: summary.date,
        lastUpdated: summary.lastUpdated,
        usefulCount: summary.usefulCount,
        likeCount: summary.likeCount
      } as WikiArticle));
      
      setWikiArticles(articles);
      setAllTags(Array.from(new Set(articles.flatMap(article => article.tags || []))));
      
      // キャッシュを更新
      await cacheManager.saveArticleSummaries(summaries);

      // ユーザープロフィールを再取得（メインDB）
      const authorIds = new Set(articles.map(article => article.authorId).filter(Boolean));
      for (const userId of authorIds) {
        await fetchUserProfile(userId as string);
      }
    } catch (error) {
      console.error("キャッシュのクリアに失敗:", error);
    } finally {
      setLoading(false);
    }
  };
  
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
    // フィルタリングしたら改めてソート
    .sort((a, b) => {
      if (sortBy === "date") {
        // 日付型とタイムスタンプの両方に対応
        const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date?.toDate();
        const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date?.toDate();
        
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      }
      
      // 数値ソート（articleScore, usefulCount, likeCount）
      const valueA = a[sortBy] || 0;
      const valueB = b[sortBy] || 0;
      return valueB - valueA;
    });

  // ページネーション用の記事を取得
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * articlesPerPage,
    currentPage * articlesPerPage
  );

  // 総ページ数を計算
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);

  // ページ変更時の処理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 検索条件が変更されたら1ページ目に戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, sortBy]);
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // ソート方法変更時の処理を簡略化（キャッシュデータのクライアントサイドソートを活用）
  const handleSortChange = (newSortBy: "articleScore" | "usefulCount" | "likeCount" | "date") => {
    setSortBy(newSortBy);
    // クライアントサイドでソートするので、セットだけでOK
    // setLoading(true); <- これは不要
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
                onChange={(e) => handleSortChange(e.target.value as "articleScore" | "usefulCount" | "likeCount" | "date")}
                className="bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="articleScore">評価値順</option>
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
          {paginatedArticles.length > 0 ? (
            paginatedArticles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.4, duration: 0.4 }}
              >
                <Link href={`/wiki/view?id=${article.id}`}>
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
                        <div className="relative mr-3"> {/* mr-2からmr-3に変更 */}
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                            {article.authorId && userProfiles[article.authorId]?.profileImage ? (
                              <img
                                src={userProfiles[article.authorId].profileImage || ""}
                                alt={article.author || "ユーザー"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FiUser size={14} />
                            )}
                          </div>
                          
                          {/* バッジ表示を追加 */}
                          {article.authorId && userProfiles[article.authorId]?.selectedBadge && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                              <BadgeIcon 
                                badgeId={userProfiles[article.authorId].selectedBadge || ""} 
                                size="xs"
                              />
                            </div>
                          )}
                        </div>
                        {article.author}
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
        
        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentPage === 1
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              前へ
            </motion.button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <motion.button
                key={page}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                {page}
              </motion.button>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentPage === totalPages
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              次へ
            </motion.button>
          </div>
        )}
        
        <div className="mt-12 text-center flex justify-center gap-4">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-6 py-3 hover:bg-white/15 transition-all duration-300"
            >
              ホームに戻る
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearCache}
            className="bg-purple-500/20 backdrop-blur-md border border-purple-500/40 rounded-lg px-6 py-3 hover:bg-purple-500/30 transition-all duration-300 flex items-center gap-2"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            キャッシュを更新
          </motion.button>
        </div>
      </div>
    </div>
  );
}
