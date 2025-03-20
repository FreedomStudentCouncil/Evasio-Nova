"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FiSave, FiX, FiImage, FiArrowLeft, FiTag, FiAlertCircle, FiChevronLeft, FiChevronRight, FiShield } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import ImageUploader from "./ImageUploader";
import { getArticleById, updateArticle, WikiArticle, getAllTags, updateTags, decrementTags, Tag } from "../firebase/wiki";
import { deleteImage } from "../imgbb/api";

// 型定義を追加
interface StoredImage {
  url: string;
  id: string;
  deleteUrl: string;
}

export default function EditWikiPageClient() {
  const router = useRouter();
  const { user, isAdmin } = useAuth(); // isAdminを追加
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id") || "";
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<StoredImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    content?: string;
    tags?: string;
  }>({});

  // 全角文字を考慮した文字数カウント関数を修正
  const countFullWidthChars = (str: string): number => {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charAt(i);
      // 全角文字の判定を修正
      if (char.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/)) {
        count += 2;
      } else {
        count += 1;
      }
    }
    return count;
  };

  // バリデーション関数
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // タイトルのバリデーション
    if (countFullWidthChars(title) > 80) {
      errors.title = "タイトルは全角30文字以内で入力してください";
      isValid = false;
    }

    // タグのバリデーション
    if (tags.length === 0) {
      errors.tags = "少なくとも1つのタグを追加してください";
      isValid = false;
    }
    for (const tag of tags) {
      if (countFullWidthChars(tag) > 30) {
        errors.tags = "タグは全角15文字以内で入力してください";
        isValid = false;
        break;
      }
    }

    // 本文のバリデーション
    if (countFullWidthChars(content) > 10000) {
      errors.content = "本文は全角1万文字以内で入力してください";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  useEffect(() => {
    const fetchArticleData = async () => {
      if (!articleId || !user) return;
      
      try {
        const article = await getArticleById(articleId);
        if (!article) {
          setNotFound(true);
          return;
        }
        
        setTitle(article.title);
        setContent(article.content);
        setDescription(article.description || "");
        setTags(article.tags || []);
        
        // 画像情報の設定を修正
        if (article.imageUrl && article.imageId) {
          setImages([{
            url: article.imageUrl,
            id: article.imageId,
            deleteUrl: article.deleteUrl || "" // 既存の画像にdeleteUrlがない場合は空文字を設定
          }]);
        }
        
        // 管理者の場合は常に編集可能
        const isMyArticle = article.authorId === user.uid;
        setIsOwner(isMyArticle || isAdmin); // 管理者も記事所有者とみなす
        
      } catch (error) {
        console.error("記事の取得に失敗しました:", error);
        setError("記事の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArticleData();
  }, [articleId, user, isAdmin]); // isAdminを依存配列に追加

  useEffect(() => {
    const fetchTags = async () => {
      const tags = await getAllTags();
      setAllTags(tags);
    };
    fetchTags();
  }, []);

  // タグ入力時の候補表示
  useEffect(() => {
    if (tagInput.trim()) {
      const filtered = allTags
        .filter(tag => 
          tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(tag.name)
        )
        .slice(0, 5);
      setFilteredTags(filtered);
      setShowTagSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowTagSuggestions(false);
    }
  }, [tagInput, allTags, tags]);

  // IDがない場合のUIを追加
  if (!articleId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex justify-center items-center">
        <div className="bg-amber-900/30 border border-amber-500 rounded-lg p-6 text-center max-w-lg">
          <h2 className="text-xl font-bold text-amber-400 mb-2">記事IDが指定されていません</h2>
          <p className="text-white">編集する記事のIDをクエリパラメータとして指定してください。</p>
          <p className="text-gray-400 mt-4">例: /wiki/edit?id=article-123</p>
        </div>
      </div>
    );
  }

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
  
  // 自分の記事でない場合（管理者以外）
  if (!isOwner && !isAdmin) {
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
          
          <Link href={`/wiki/view?id=${articleId}`}>
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

  const handleImageUpload = (imageUrl: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const imageMarkdown = `![YOUR IMAGE NAME](${imageUrl})`;
      const newText = text.substring(0, start) + imageMarkdown + text.substring(end);
      setContent(newText);
      // カーソル位置を更新
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
    }
  };

  const handleInsertMarkdown = (markdown: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + markdown + text.substring(end);
      setContent(newText);
      // カーソル位置を更新
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
    }
  };

  // タグ追加処理を修正
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 8) {
      if (countFullWidthChars(trimmedTag) > 15) {
        setValidationErrors(prev => ({
          ...prev,
          tags: "タグは全角15文字以内で入力してください"
        }));
        return;
      }
      setTags([...tags, trimmedTag]);
      setTagInput("");
      setShowTagSuggestions(false);
      setValidationErrors(prev => ({ ...prev, tags: undefined }));
    }
  };

  // タグ削除処理を修正
  const handleRemoveTag = async (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    await decrementTags([tagToRemove]);
  };

  // タグ入力時のEnterキー処理
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 画像アップロード完了時の処理を修正
  const handleImageUploadComplete = (url: string, id: string, deleteUrl: string) => {
    setImages(prev => {
      const newImages = [...prev, { url, id, deleteUrl }];
      setCurrentImageIndex(newImages.length - 1); // インデックスを修正
      return newImages;
    });
    setShowImageUploader(false);
  };

  // 画像削除処理を修正
  const handleImageDelete = async (index: number) => {
    const image = images[index];
    if (image.deleteUrl) {
      const success = await deleteImage(image.deleteUrl);
      if (success) {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        if (currentImageIndex >= newImages.length) {
          setCurrentImageIndex(Math.max(0, newImages.length - 1));
        }
      } else {
        setError("画像の削除に失敗しました");
      }
    }
  };

  // 画像切り替え処理
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // フォーム送信処理を修正
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const articleData: Partial<WikiArticle> = {
        title,
        content,
        description: description || content.substring(0, 150) + (content.length > 150 ? '...' : ''),
        tags,
        imageUrl: images.length > 0 ? images[currentImageIndex].url : "",
        imageId: images.length > 0 ? images[currentImageIndex].id : "",
        deleteUrl: images.length > 0 ? images[currentImageIndex].deleteUrl : "",
      };
      
      await updateArticle(articleId, articleData);
      await updateTags(tags);
      router.push(`/wiki/view?id=${articleId}`);
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
          <Link href={`/wiki/view?id=${articleId}`}>
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
              <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">記事を編集</h1>
                
                {/* 管理者モードバッジ */}
                {isAdmin && !isOwner && (
                  <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg px-3 py-1.5 flex items-center">
                    <FiShield className="mr-2" />
                    <span>管理者モード</span>
                  </div>
                )}
              </div>
              <p className="text-slate-300">最新の情報に更新して、より役立つコンテンツにしましょう</p>
            </div>
            
            {/* 管理者警告メッセージ */}
            {isAdmin && !isOwner && (
              <div className="mx-6 sm:mx-8 mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start">
                  <FiAlertCircle className="text-amber-400 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-300">管理者として編集しています</h3>
                    <p className="text-slate-300 text-sm mt-1">
                      あなたは管理者として他のユーザーの記事を編集しています。
                      記事内容に問題がある場合のみ編集してください。
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
                      onFocus={() => setShowTagSuggestions(true)}
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
                
                {/* タグ候補の表示 */}
                {showTagSuggestions && filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 shadow-lg">
                    {filteredTags.map(tag => (
                      <button
                        key={tag.name}
                        onClick={() => {
                          setTagInput(tag.name);
                          setShowTagSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors"
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                )}
                
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
                
                {!showImageUploader && images.length === 0 ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowImageUploader(true)}
                    className="w-full py-3 px-4 border border-dashed border-white/30 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                  >
                    <FiImage className="mr-2" /> 画像をアップロード
                  </motion.button>
                ) : images.length > 0 ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-64">
                      {images.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePrevImage}
                            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                          >
                            <FiChevronLeft size={24} />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleNextImage}
                            className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                          >
                            <FiChevronRight size={24} />
                          </motion.button>
                        </div>
                      )}
                      <Image 
                        src={images[currentImageIndex].url} 
                        alt={`画像 ${currentImageIndex + 1}`}
                        fill
                        style={{objectFit: "contain"}}
                        className="rounded-lg"
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleImageDelete(currentImageIndex)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 z-10"
                      >
                        <FiX />
                      </motion.button>
                      {images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowImageUploader(true)}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center"
                      >
                        <FiImage className="mr-2" /> 画像を追加
                      </motion.button>
                      <div className="flex gap-2">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleImageUpload(images[currentImageIndex].url)}
                          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center"
                        >
                          <FiImage className="mr-2" />
                          本文に画像を追加
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigator.clipboard.writeText(images[currentImageIndex].url)}
                          className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          URLをコピー
                        </motion.button>
                      </div>
                    </div>
                    {showImageUploader && (
                      <div className="border border-white/20 rounded-lg p-4 bg-white/5 mt-4">
                        <ImageUploader 
                          onUploadComplete={handleImageUploadComplete}
                          onInsertMarkdown={handleInsertMarkdown}
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
                ) : (
                  <div className="border border-white/20 rounded-lg p-4 bg-white/5">
                    <ImageUploader 
                      onUploadComplete={handleImageUploadComplete}
                      onInsertMarkdown={handleInsertMarkdown}
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
              
              {/* タイトルと本文のバリデーションエラー表示を追加 */}
              {validationErrors.title && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.title}</p>
              )}
              
              {validationErrors.content && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.content}</p>
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
                
                <Link href={`/wiki/view?id=${articleId}`} className="flex-1">
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