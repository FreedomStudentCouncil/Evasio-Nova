"use client";
import { useState } from 'react';
import { uploadImage, UploadedImage } from '../imgbb/api';
import Image from 'next/image';

interface ImageUploaderProps {
  onUploadComplete: (url: string, id: string, deleteUrl: string) => void;
  onInsertMarkdown?: (markdown: string) => void;
  className?: string;
}

export default function ImageUploader({ onUploadComplete, onInsertMarkdown, className }: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（32MB制限）
    if (file.size > 32 * 1024 * 1024) {
      setError('ファイルサイズは32MB以下にしてください');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadedImage(null);

    try {
      const imageData = await uploadImage(file);
      setUploadedImage(imageData);
      onUploadComplete(imageData.url, imageData.id, imageData.deleteUrl);
      e.target.value = '';
    } catch (err: any) {
      setError(err.message || '画像のアップロードに失敗しました');
      console.error('アップロードエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertToContent = () => {
    if (uploadedImage) {
      const markdown = `![${uploadedImage.filename}](${uploadedImage.url})`;
      onInsertMarkdown?.(markdown);
    }
  };

  return (
    <div className={`my-4 ${className || ''}`}>
      <label className="block mb-2">
        <span className="text-gray-300">画像をアップロード（32MB以下）</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={loading}
          className="block w-full text-sm text-gray-300
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-500/20 file:text-blue-300
            hover:file:bg-blue-500/30
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </label>
      
      {loading && (
        <div className="text-gray-400 mt-2">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            アップロード中...
          </div>
        </div>
      )}
      
      {error && (
        <div className="text-red-400 mt-2 p-2 bg-red-500/10 rounded">
          {error}
        </div>
      )}

      {uploadedImage && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleInsertToContent}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg
                hover:bg-blue-500/30 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v9z" />
              </svg>
              本文に画像を追加
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(uploadedImage.url)}
              className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg
                hover:bg-gray-500/30 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              URLをコピー
            </button>
            <span className="text-sm text-gray-400">
              {uploadedImage.filename}
            </span>
          </div>
          <div className="mt-2 relative w-full h-40 bg-gray-800/50 rounded-lg overflow-hidden">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
                <div className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  画像を読み込み中...
                </div>
              </div>
            )}
            <Image
              src={uploadedImage.url}
              alt={uploadedImage.filename}
              fill
              className="object-contain"
              onLoadingComplete={() => setImageLoading(false)}
              onLoad={() => setImageLoading(false)}
              onLoadStart={() => setImageLoading(true)}
            />
          </div>
        </div>
      )}

      <p className="text-sm text-gray-400 mt-2">
        ※アップロードした画像は公開され、後から削除することが困難になる場合があります。
        <br />
        ※個人情報や機密情報を含む画像は絶対にアップロードしないでください。
      </p>
    </div>
  );
}
