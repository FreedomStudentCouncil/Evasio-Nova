import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  profileImage?: string; // base64エンコードされた画像データ
}

/**
 * ユーザープロフィールを取得する
 * @param uid ユーザーID
 * @returns ユーザープロフィール
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('ユーザープロフィール取得エラー:', error);
    throw error;
  }
}

/**
 * ユーザープロフィールを作成または更新する
 * @param user Firebase認証ユーザー
 */
export async function createOrUpdateUserProfile(user: User): Promise<void> {
  try {
    const { uid, displayName, email, photoURL } = user;
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    const now = new Date().toISOString();
    
    if (!userSnap.exists()) {
      // 新規ユーザー
      await setDoc(userRef, {
        displayName: displayName || email?.split('@')[0] || '匿名ユーザー',
        email,
        photoURL: photoURL || null,
        bio: '',
        joinedAt: now,
        lastLoginAt: now
      });
    } else {
      // 既存ユーザー
      await updateDoc(userRef, {
        lastLoginAt: now,
        ...(displayName && { displayName }),
        ...(photoURL && { photoURL })
      });
    }
  } catch (error) {
    console.error('ユーザープロフィール更新エラー:', error);
    throw error;
  }
}

/**
 * ユーザープロフィールを更新する
 * @param uid ユーザーID
 * @param data 更新データ
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  } catch (error) {
    console.error('ユーザープロフィール更新エラー:', error);
    throw error;
  }
}

/**
 * プロフィール画像を更新する
 * @param uid ユーザーID
 * @param imageFile 画像ファイル
 */
export async function updateProfileImage(uid: string, imageFile: File): Promise<void> {
  try {
    // 画像をリサイズしてbase64に変換
    const resizedImage = await resizeImage(imageFile, 250, 250);
    const base64Image = await convertToBase64(resizedImage);

    // Firestoreに保存
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      profileImage: base64Image
    });
  } catch (error) {
    console.error('プロフィール画像更新エラー:', error);
    throw error;
  }
}

/**
 * 画像をリサイズする
 */
function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // アスペクト比を維持しながらリサイズ
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      // 正方形にリサイズ
      const size = Math.min(width, height);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      // 背景を透明に設定
      ctx.clearRect(0, 0, size, size);
      
      // 円形のクリッピングパスを作成
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // 画像を中央に配置して描画
      const x = (size - width) / 2;
      const y = (size - height) / 2;
      ctx.drawImage(img, x, y, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png', // PNG形式を使用して透明度を保持
        0.5
      );
      
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
}

/**
 * BlobをBase64文字列に変換する
 */
function convertToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}
