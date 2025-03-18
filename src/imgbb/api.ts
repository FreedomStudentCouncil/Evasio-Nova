interface ImgBBResponse {
  data: {
    id: string;
    url: string;
    display_url: string;
    delete_url: string;
    title: string;
    filename: string;
  };
  success: boolean;
  status: number;
}

export interface UploadedImage {
  id: string;
  url: string;
  filename: string;
  deleteUrl: string;
}

export async function uploadImage(image: File): Promise<UploadedImage> {
  const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!API_KEY) {
    throw new Error('ImgBB API Keyが設定されていません');
  }

  // 画像の最適化
  const optimizedImage = await optimizeImage(image);
  
  const formData = new FormData();
  formData.append('image', optimizedImage);
  // 画質設定（0-100）
  formData.append('quality', '85');

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ImgBBResponse = await response.json();
    
    if (data.success) {
      return {
        id: data.data.id,
        url: data.data.url,
        filename: data.data.filename || image.name,
        deleteUrl: data.data.delete_url
      };
    } else {
      throw new Error('アップロードに失敗しました');
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('画像のアップロードに失敗しました');
  }
}

// 画像の最適化
async function optimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // 最大サイズを設定（例：1920px）
      const maxSize = 1920;
      let width = img.width;
      let height = img.height;

      // アスペクト比を保持しながらリサイズ
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // 画質を85%に設定してBlobに変換
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('画像の最適化に失敗しました'));
          }
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(file);
  });
}

// 画像削除用の関数を修正
export async function deleteImage(deleteUrl: string): Promise<boolean> {
  try {
    // delete_urlからIDを抽出
    const deleteId = deleteUrl.split('/').pop();
    if (!deleteId) return false;

    const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!API_KEY) return false;

    // ImgBB APIを使用して削除
    const response = await fetch(`https://api.imgbb.com/1/image/delete/${deleteId}?key=${API_KEY}`, {
      method: 'DELETE',
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
} 