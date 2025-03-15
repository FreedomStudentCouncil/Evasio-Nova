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
