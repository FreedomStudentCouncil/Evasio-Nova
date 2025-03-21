"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiSave, FiX, FiImage, FiArrowLeft, FiTag, FiAlertCircle, FiChevronLeft, FiChevronRight, FiCode, FiEye, FiAlertTriangle } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import ImageUploader from "../../../components/ImageUploader";
import MarkdownPreview from "../../../components/MarkdownPreview";
import { createArticle, getAllTags, updateTags, Tag } from "../../../firebase/wiki";
import { deleteImage } from "../../../imgbb/api";
import MarkdownToolbar from "../../../components/MarkdownToolbar";
import { draftManager, DraftArticle } from "../../../utils/draftManager";

// 型定義を追加
interface StoredImage {
  url: string;
  id: string;
  deleteUrl: string;
}

export default function CreateArticlePage() {
  const router = useRouter();
  const { user, isEmailVerified } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");  // 追加
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<StoredImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    content?: string;
    tags?: string;
  }>({});
  const [editorMode, setEditorMode] = useState<'raw' | 'preview'>('raw');
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftData, setDraftData] = useState<DraftArticle | null>(null);

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

  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-6 text-center max-w-lg">
          <FiAlertTriangle className="mx-auto text-4xl text-red-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">メール認証が必要です</h2>
          <p className="text-gray-300 mb-4">
            記事を作成するには、メールアドレスの認証が必要です。
            メールボックスを確認して、認証を完了してください。
          </p>
          <Link href="/login">
            <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
              ログインページに戻る
            </button>
          </Link>
        </div>
      </div>
    );
  }

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

  // バリデーション関数を修正
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // タイトルのバリデーション
    if (countFullWidthChars(title) > 80) {  // 全角40文字分 = 80
      errors.title = "タイトルは全角40文字以内で入力してください";
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

  // タグの取得
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

  // 画像アップロード完了時の処理を修正
  const handleImageUploadComplete = (url: string, id: string, deleteUrl: string) => {
    setImages(prev => {
      const newImages = [...prev, { url, id, deleteUrl }];
      setCurrentImageIndex(newImages.length - 1); // インデックスを修正
      return newImages;
    });
    setShowImageUploader(false);
  };

  // 画像削除処理を追加
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

  // 画像切り替え処理を追加
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // 画像挿入用の関数を追加
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

  // タイトル入力時のエラークリア処理を追加
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setValidationErrors(prev => ({ ...prev, title: undefined }));
  };

  // 本文入力時のエラークリア処理を追加
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setValidationErrors(prev => ({ ...prev, content: undefined }));
  };

  // テキストエリアへの挿入を処理する関数を追加
  const handleInsert = (markdown: string) => {
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

  // 下書きの自動保存
  useEffect(() => {
    const saveDraft = async () => {
      if (title || content || description || tags.length > 0 || images.length > 0) {
        setIsSaving(true);
        try {
          const draft: DraftArticle = {
            title,
            content,
            description,
            tags,
            images,
            lastModified: Date.now()
          };
          await draftManager.saveDraft(draft);
          setLastSaved(new Date());
        } finally {
          setIsSaving(false);
        }
      }
    };

    // 入力から500ms後に保存
    const timeoutId = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeoutId);
  }, [title, content, description, tags, images]);

  // 初回表示時の下書き確認処理を修正
  useEffect(() => {
    const checkDraft = async () => {
      const draft = await draftManager.getDraft();
      if (draft) {
        setDraftData(draft);
        setDraftConfirmOpen(true);
      }
    };
    checkDraft();
  }, []);

  // 下書きを読み込む処理を修正
  const loadDraft = () => {
    if (draftData) {
      setTitle(draftData.title);
      setContent(draftData.content);
      setDescription(draftData.description);
      setTags(draftData.tags);
      setImages(draftData.images);
    }
    setDraftConfirmOpen(false);
    setDraftData(null);
  };

  // 下書きを破棄する処理を修正
  const discardDraft = async () => {
    await draftManager.deleteDraft();
    setDraftConfirmOpen(false);
    setDraftData(null);
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
      const articleData = {
        title,
        content,
        description: description || content.substring(0, 150) + (content.length > 150 ? '...' : ''),  // descriptionを追加
        tags,
        author: user.displayName || "匿名ユーザー",
        authorId: user.uid,
        imageUrl: images.length > 0 ? images[currentImageIndex].url : "",
        imageId: images.length > 0 ? images[currentImageIndex].id : "",
        deleteUrl: images.length > 0 ? images[currentImageIndex].deleteUrl : "", 
        date: new Date().toISOString(),
        usefulCount: 0,
        likeCount: 0
      };
      
      // Firestoreに保存
      console.log("記事の投稿を開始します...");
      const articleId = await createArticle(articleData);
      await updateTags(tags);
      console.log("記事の投稿に成功しました。ID:", articleId);
      
      // 投稿成功時に下書きを削除
      await draftManager.deleteDraft();

      // 投稿完了メッセージをユーザーに表示
      alert("記事の投稿が完了しました！");
      
      // 成功したら記事表示ページへリダイレクト
      router.push(`/wiki/view?id=${articleId}`);
    } catch (error) {
      console.error("記事の投稿エラー:", error);
      setError("記事の投稿に失敗しました。もう一度お試しください。");
      if (error instanceof Error) {
        console.error("エラー詳細:", error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      {/* 下書き確認モーダル */}
      {draftConfirmOpen && draftData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-white/20 p-6 m-4 max-w-2xl w-full"
          >
            <h3 className="text-xl font-bold mb-4">下書きが見つかりました</h3>
            <div className="mb-6 space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                {/* 下書きのプレビュー */}
                <div className="mb-4">
                  <span className="text-slate-400 text-sm">タイトル:</span>
                  <h4 className="text-lg font-medium">{draftData.title || "無題"}</h4>
                </div>
                {draftData.tags.length > 0 && (
                  <div className="mb-4">
                    <span className="text-slate-400 text-sm">タグ:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {draftData.tags.map(tag => (
                        <span key={tag} className="bg-blue-500/30 text-blue-100 rounded-full px-2 py-0.5 text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-sm">本文プレビュー:</span>
                  <p className="mt-1 text-slate-300 line-clamp-3">
                    {draftData.content || "本文なし"}
                  </p>
                </div>
                <div className="mt-4 text-sm text-slate-400">
                  最終更新: {new Date(draftData.lastModified).toLocaleString()}
                </div>
              </div>
              <p className="text-slate-300">
                この下書きを読み込みますか？
              </p>
            </div>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={loadDraft}
                className="flex-1 py-2 px-4 bg-purple-500 rounded-lg font-medium hover:bg-purple-600"
              >
                下書きを読み込む
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={discardDraft}
                className="flex-1 py-2 px-4 bg-white/10 rounded-lg font-medium hover:bg-white/20"
              >
                破棄して新規作成
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 保存状態のインジケータを追加 */}
      <div className="fixed bottom-4 right-4 z-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/90 backdrop-blur-sm rounded-lg border border-white/10 px-4 py-2 text-sm flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span>保存中...</span>
            </>
          ) : lastSaved ? (
            <>
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>
                下書き保存済み ({new Date(lastSaved).toLocaleTimeString()} 更新)
              </span>
            </>
          ) : null}
        </motion.div>
      </div>

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
                  onChange={handleTitleChange}  // 変更
                  placeholder="記事のタイトルを入力..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              {/* 概要を追加 */}
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
                
                {validationErrors.tags && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.tags}</p>
                )}
              </div>
              
              {/* 画像アップロード */}
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
              
              {/* 本文 - タブ付きエディタに変更 */}
              <div className="mb-6">
                <label htmlFor="content" className="block text-sm font-medium mb-2">
                  本文 *
                </label>
                
                {/* タブ切り替えボタン */}
                <div className="flex mb-2 border-b border-white/20">
                  <button
                    type="button"
                    onClick={() => setEditorMode('raw')}
                    className={`px-4 py-2 flex items-center text-sm font-medium transition-colors ${
                      editorMode === 'raw' 
                        ? 'text-purple-300 border-b-2 border-purple-500' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FiCode className="mr-2" /> 編集
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`px-4 py-2 flex items-center text-sm font-medium transition-colors ${
                      editorMode === 'preview' 
                        ? 'text-purple-300 border-b-2 border-purple-500' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FiEye className="mr-2" /> プレビュー
                  </button>
                </div>
                
                {/* エディタとプレビューの切り替え */}
                <div className="rounded-lg border border-white/20 bg-white/10">
                  {editorMode === 'raw' ? (
                    <>
                      <MarkdownToolbar 
                        onInsert={handleInsert} 
                        onImageClick={() => setShowImageUploader(true)}
                        className="border-b border-white/20" 
                      />
                      <textarea
                        id="content"
                        value={content}
                        onChange={handleContentChange}
                        placeholder="記事の本文をここに入力..."
                        rows={15}
                        className="w-full bg-transparent rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </>
                  ) : (
                    <div className="p-4 min-h-[300px] max-h-[600px] overflow-y-auto">
                      {content ? (
                        <MarkdownPreview content={content} />
                      ) : (
                        <div className="text-slate-400 italic">プレビューする内容がありません。編集タブでコンテンツを入力してください。</div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-slate-400 mt-2 flex items-center">
                  <span className="mr-1">マークダウン記法が使用できます</span>
                  {editorMode === 'raw' && (
                    <button 
                      type="button" 
                      onClick={() => setEditorMode('preview')} 
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      プレビューで確認
                    </button>
                  )}
                </p>
              </div>
              
              {/* タイトルと本文のバリデーションエラー表示を追加 */}
              {validationErrors.title && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.title}</p>
              )}
              
              {validationErrors.content && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.content}</p>
              )}
              
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
                  whileHover={isSubmitting ? {} : { scale: 1.03 }}
                  whileTap={isSubmitting ? {} : { scale: 0.97 }}
                  className={`flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold shadow-lg transition-all duration-300 flex items-center justify-center
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}`}
                >
                  <FiSave className="mr-2" /> {isSubmitting ? '投稿中...' : '記事を投稿する'}
                </motion.button>
                
                <Link href="/wiki" className="flex-1">
                  <motion.button
                    type="button"
                    disabled={isSubmitting}
                    whileHover={isSubmitting ? {} : { y: -2 }}
                    whileTap={isSubmitting ? {} : { y: 0 }}
                    className={`w-full py-3 bg-white/10 rounded-lg font-semibold transition-all duration-300
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}`}
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
