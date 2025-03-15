"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiSave, FiX, FiImage, FiArrowLeft, FiTag, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import ImageUploader from "./ImageUploader";
import { getArticleById, updateArticle, WikiArticle } from "../firebase/wiki";

interface EditWikiPageClientProps {
  articleId: string;
}

export default function EditWikiPageClient({ articleId }: EditWikiPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageId, setImageId] = useState("");
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchArticleData = async () => {
      if (!articleId || !user) return;
      
      try {
        const article = await getArticleById(articleId);
        if (!article) {
          setNotFound(true);
          return;
        }
        
        // 記事が存在する場合、フォームにデータを設定
        setTitle(article.title);
        setContent(article.content);
        setDescription(article.description || "");
        setTags(article.tags || []);
        if (article.imageUrl) setImageUrl(article.imageUrl);
        if (article.imageId) setImageId(article.imageId);
        
        // 自分の記事かどうかをチェック
        const isMyArticle = article.authorId === user.uid;
        setIsOwner(isMyArticle);
        
      } catch (error) {
        console.error("記事の取得に失敗しました:", error);
        setError("記事の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArticleData();
  }, [articleId, user]);

  // 認証チェック
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md w-full text-center"
        >
          <h2 className="text-2xl font-bold mb-4">ログインが必要です</h2>
          <p className="text-slate-300 mb-6">Wiki記事を編集するにはログインしてください。</p>
          
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-bold"
            >
              ログインページへ
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // 読み込み中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }
  
  // 記事が見つからない
  if (notFound) {
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
  
  // 自分の記事でない場合
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex flex-col justify-center items-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md w-full text-center"
        >
          <FiAlertCircle className="text-5xl text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">編集権限がありません</h2>
          <p className="text-slate-300 mb-6">この記事はあなたが作成したものではないため、編集できません。</p>
          
          <Link href={`/wiki/${articleId}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-bold"
            >
              記事に戻る
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // タグ追加処理
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 8) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  // タグ削除処理
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // タグ入力時のEnterキー処理
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 画像アップロード完了時の処理
  const handleImageUploadComplete = (url: string, id: string) => {
    setImageUrl(url);
    setImageId(id);
    setShowImageUploader(false);
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    
    if (!content.trim()) {
      setError("本文を入力してください");
      return;
    }
    
    if (tags.length === 0) {
      setError("少なくとも1つのタグを追加してください");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // 編集内容を更新
      const articleData: Partial<WikiArticle> = {
        title,
        content,
        description: description || content.substring(0, 150) + (content.length > 150 ? '...' : ''),
        tags,
        imageUrl,
        imageId,
      };
      
      // Firestoreに保存
      await updateArticle(articleId, articleData);
      
      // 成功したら記事表示ページへリダイレクト
      router.push(`/wiki/${articleId}`);
    } catch (error) {
      console.error("記事の更新エラー:", error);
      setError("記事の更新に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link href={`/wiki/${articleId}`}>
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-8"
            >
              <FiArrowLeft className="mr-2" /> 記事に戻る
            </motion.button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-white/10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">記事を編集</h1>
              <p className="text-slate-300">最新の情報に更新して、より役立つコンテンツにしましょう</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {/* タイトル */}
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  タイトル *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="記事のタイトルを入力..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              {/* 概要 */}
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  概要（任意）
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="記事の簡単な説明..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  入力しない場合は本文の先頭から自動生成されます
                </p>
              </div>
              
              {/* タグ */}
              <div className="mb-6">
                <label htmlFor="tags" className="block text-sm font-medium mb-2">
                  タグ *
                </label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <FiTag className="absolute left-3 top-3 text-slate-400" />
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="タグを追加..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddTag}
                    className="bg-purple-500/80 px-4 py-2 rounded-lg hover:bg-purple-500 transition-colors"
                  >
                    追加
                  </motion.button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map(tag => (
                      <div 
                        key={tag}
                        className="bg-blue-500/30 text-blue-100 rounded-full px-3 py-1 flex items-center text-sm"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-200 hover:text-white focus:outline-none"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-slate-400 mt-2">
                  最大8つのタグを追加できます
                </p>
              </div>
              
              {/* 画像アップロード/編集 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  画像（任意）
                </label>
                
                {!showImageUploader && !imageUrl ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowImageUploader(true)}
                    className="w-full py-3 px-4 border border-dashed border-white/30 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <FiImage className="mr-2" /> 画像をアップロード
                  </motion.button>
                ) : imageUrl ? (
                  <div className="relative w-full h-48">
                    <Image 
                      src={imageUrl} 
                      alt="記事画像" 
                      fill
                      style={{objectFit: "cover"}}
                      className="rounded-lg"
                    />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setImageUrl("");
                        setImageId("");
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 z-10"
                    >
                      <FiX />
                    </motion.button>
                  </div>
                ) : (
                  <div className="border border-white/20 rounded-lg p-4 bg-white/5">
                    <ImageUploader 
                      onUploadComplete={handleImageUploadComplete}
                      className="max-w-xl mx-auto"
                    />
                    <div className="flex justify-end mt-4">
                      <button
                        type="button"
                        onClick={() => setShowImageUploader(false)}
                        className="text-slate-300 hover:text-white text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 本文 */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium mb-2">
                  本文 *
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="記事の本文をここに入力..."
                  rows={10}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-2">
                  マークダウン記法が使用できます
                </p>
              </div>
              
              {/* エラーメッセージ */}
              {error && (
                <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200">
                  {error}
                </div>
              )}
              
              {/* ボタン */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center
                    ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <FiSave className="mr-2" /> {isSubmitting ? '更新中...' : '変更を保存'}
                </motion.button>
                
                <Link href={`/wiki/${articleId}`} className="flex-1">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    className="w-full py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/15 transition-all duration-300"
                  >
                    キャンセル
                  </motion.button>
                </Link>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}