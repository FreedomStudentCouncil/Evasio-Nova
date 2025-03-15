import { useState } from 'react';
import { uploadImage, ImgurResponse } from '../imgur/api';

interface UseImgurOptions {
  onSuccess?: (response: ImgurResponse) => void;
  onError?: (error: Error) => void;
}

export function useImgur(options?: UseImgurOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [imageData, setImageData] = useState<ImgurResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ファイル選択時のプレビュー生成
  const handleFileChange = (file: File) => {
    if (!file) return;
    
    // ファイル読み込み用のオブジェクト
    const reader = new FileReader();
    
    reader.onloadstart = () => setProgress(0);
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress((e.loaded / e.total) * 100);
      }
    };
    
    reader.onload = (e) => {
      if (e.target?.result) {
        setPreviewUrl(e.target.result as string);
      }
    };
    
    reader.onerror = () => {
      setError(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsDataURL(file);
  };

  // Imgurへの画像アップロード処理
  const upload = async (file: File | string, uploadOptions = {}) => {
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await uploadImage(file, uploadOptions);
      setImageData(response);
      options?.onSuccess?.(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('アップロードエラー');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // アップロードをリセット
  const reset = () => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setImageData(null);
    setPreviewUrl(null);
  };

  return {
    upload,
    handleFileChange,
    reset,
    isUploading,
    progress,
    error,
    imageData,
    previewUrl
  };
}
