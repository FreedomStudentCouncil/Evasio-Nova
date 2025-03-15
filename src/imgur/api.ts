import axios from 'axios';
import FormData from 'form-data';
import { imgurConfig, defaultUploadSettings } from './config';

interface UploadOptions {
  title?: string;
  description?: string;
  album?: string;
}

export interface ImgurResponse {
  id: string;
  title: string;
  description: string;
  datetime: number;
  type: string;
  link: string;
  deletehash?: string;
  width: number;
  height: number;
}

/**
 * 画像をImgurにアップロードする
 * @param image - ファイルまたはBase64エンコードされた画像データ
 * @param options - アップロードオプション
 * @returns アップロード結果
 */
export async function uploadImage(
  image: File | string, 
  options: UploadOptions = {}
): Promise<ImgurResponse> {
  const formData = new FormData();
  
  // 画像データを追加（ファイルまたはBase64形式）
  if (typeof image === 'string') {
    // Base64データの場合（'data:image/jpeg;base64,' などのプレフィックスを削除）
    const base64Data = image.includes('data:image') 
      ? image.split(',')[1] 
      : image;
    formData.append('image', base64Data);
    formData.append('type', 'base64');
  } else {
    // Fileオブジェクトの場合
    formData.append('image', image);
  }
  
  // オプションパラメータを追加
  const settings = { ...defaultUploadSettings, ...options };
  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value);
    }
  });

  try {
    const response = await axios.post(`${imgurConfig.apiUrl}/image`, formData, {
      headers: {
        'Authorization': `Client-ID ${imgurConfig.clientId}`,
      }
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.data.error);
    }
  } catch (error) {
    console.error('Imgur画像アップロードエラー:', error);
    throw error;
  }
}

/**
 * アルバム内の画像一覧を取得する
 * @param albumId - アルバムID
 * @returns 画像の配列
 */
export async function getAlbumImages(albumId: string): Promise<ImgurResponse[]> {
  try {
    const response = await axios.get(`${imgurConfig.apiUrl}/album/${albumId}/images`, {
      headers: {
        'Authorization': `Client-ID ${imgurConfig.clientId}`
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.data.error);
    }
  } catch (error) {
    console.error('Imgurアルバム取得エラー:', error);
    throw error;
  }
}

/**
 * 画像IDから画像情報を取得する
 * @param imageId - 画像ID
 * @returns 画像情報
 */
export async function getImage(imageId: string): Promise<ImgurResponse> {
  try {
    const response = await axios.get(`${imgurConfig.apiUrl}/image/${imageId}`, {
      headers: {
        'Authorization': `Client-ID ${imgurConfig.clientId}`
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.data.error);
    }
  } catch (error) {
    console.error('Imgur画像取得エラー:', error);
    throw error;
  }
}

/**
 * 画像を削除する
 * @param deleteHash - 画像の削除ハッシュ
 * @returns 削除成功かどうか
 */
export async function deleteImage(deleteHash: string): Promise<boolean> {
  try {
    const response = await axios.delete(`${imgurConfig.apiUrl}/image/${deleteHash}`, {
      headers: {
        'Authorization': `Client-ID ${imgurConfig.clientId}`
      }
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Imgur画像削除エラー:', error);
    throw error;
  }
}
