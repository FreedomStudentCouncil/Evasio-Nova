"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiSave, FiX, FiImage, FiArrowLeft, FiTag } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import ImageUploader from "../../../components/ImageUploader";
import { createArticle } from "../../../firebase/wiki";
// /app/wiki/user/[id]/page.tsx など
export const dynamicParams = true; // または false
export default function CreateWikiPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageId, setImageId] = useState("");
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          <p className="text-slate-300 mb-6">Wiki記事を作成するにはログインしてください。</p>
          
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
      // 記事データの構造
      const articleData = {
        title,
        content,
        description: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
        tags,
        author: user.displayName || "匿名ユーザー",
        authorId: user.uid,
        imageUrl,
        imageId,
        date: new Date().toISOString(),
        usefulCount: 0,
        likeCount: 0
      };
      
      // Firestoreに保存
      const articleId = await createArticle(articleData);
      
      // 成功したら記事表示ページへリダイレクト - クエリパラメータ方式に変更
      router.push(`/wiki/view?id=${articleId}`);
    } catch (error) {
      console.error("記事の投稿エラー:", error);
      setError("記事の投稿に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-white/10">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">新しい記事を作成</h1>
              <p className="text-slate-300">あなたの知識を共有して、みんなを助けましょう</p>
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
              
              {/* 画像アップロード */}
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
                  <FiSave className="mr-2" /> {isSubmitting ? '投稿中...' : '記事を投稿する'}
                </motion.button>
                
                <Link href="/wiki" className="flex-1">
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
